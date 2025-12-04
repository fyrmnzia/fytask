import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validate, updateTagSchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";
import { redisHelpers } from "@/lib/redis";

// PUT /api/tags/[id]
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;
    const body = await request.json();

    const existing = await prisma.tag.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return apiError("Tag not found", 404);
    }

    const validation = validate(updateTagSchema, body);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const data = validation.data;

    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.tag.findFirst({
        where: {
          userId: user.id,
          name: { equals: data.name, mode: "insensitive" },
          id: { not: id },
        },
      });

      if (duplicate) {
        return apiError("Tag with this name already exists", 400);
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data,
    });

    // Invalidate cache
    await redisHelpers.deleteCached(`tags:${user.id}`);

    return apiResponse(tag, "Tag updated successfully");
  } catch (error) {
    console.error("Update tag error:", error);
    return apiError("Failed to update tag", 500);
  }
}

// DELETE /api/tags/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;

    const tag = await prisma.tag.findFirst({
      where: { id, userId: user.id },
    });

    if (!tag) {
      return apiError("Tag not found", 404);
    }

    // Delete tag (cascade will remove associations)
    await prisma.tag.delete({
      where: { id },
    });

    // Invalidate cache
    await redisHelpers.deleteCached(`tags:${user.id}`);

    return apiResponse(null, "Tag deleted successfully");
  } catch (error) {
    console.error("Delete tag error:", error);
    return apiError("Failed to delete tag", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
