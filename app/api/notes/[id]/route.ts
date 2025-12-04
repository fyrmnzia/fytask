import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validate, updateNoteSchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";
import { redisHelpers } from "@/lib/redis";

// GET /api/notes/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;

    const note = await prisma.note.findFirst({
      where: { id, userId: user.id },
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
        attachments: true,
        versions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!note) {
      return apiError("Note not found", 404);
    }

    return apiResponse(note);
  } catch (error) {
    console.error("Get note error:", error);
    return apiError("Failed to fetch note", 500);
  }
}

// PUT /api/notes/[id]
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;
    const body = await request.json();

    const existingNote = await prisma.note.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingNote) {
      return apiError("Note not found", 404);
    }

    const validation = validate(updateNoteSchema, body);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const data = validation.data;
    const tagIds = data.tagIds;
    delete (data as any).tagIds;

    // Create version if content changed
    const shouldCreateVersion = data.content && data.content !== existingNote.content;

    const note = await prisma.note.update({
      where: { id },
      data: {
        ...data,
        version: shouldCreateVersion ? existingNote.version + 1 : undefined,
        tags: tagIds
          ? {
              deleteMany: {},
              create: tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
        versions: shouldCreateVersion
          ? {
              create: {
                content: data.content!,
                version: existingNote.version + 1,
              },
            }
          : undefined,
      },
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    // Publish realtime update
    await redisHelpers.publish(`user:${user.id}:notes`, {
      type: "note.updated",
      data: note,
    });

    // Invalidate cache
    await redisHelpers.deleteCachedPattern(`notes:${user.id}:*`);

    return apiResponse(note, "Note updated successfully");
  } catch (error) {
    console.error("Update note error:", error);
    return apiError("Failed to update note", 500);
  }
}

// DELETE /api/notes/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;

    const note = await prisma.note.findFirst({
      where: { id, userId: user.id },
    });

    if (!note) {
      return apiError("Note not found", 404);
    }

    // Soft delete
    await prisma.note.update({
      where: { id },
      data: {
        isTrashed: true,
        trashedAt: new Date(),
      },
    });

    // Publish realtime update
    await redisHelpers.publish(`user:${user.id}:notes`, {
      type: "note.deleted",
      data: { id },
    });

    // Invalidate cache
    await redisHelpers.deleteCachedPattern(`notes:${user.id}:*`);

    return apiResponse(null, "Note moved to trash");
  } catch (error) {
    console.error("Delete note error:", error);
    return apiError("Failed to delete note", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
