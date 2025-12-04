import { NextRequest } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;

    const attachment = await prisma.attachment.findFirst({
      where: { id, userId: user.id },
    });
    if (!attachment) {
      return apiError("Attachment not found", 404);
    }

    // Delete file from filesystem
    try {
      const filepath = join(UPLOAD_DIR, attachment.filename);
      await unlink(filepath);
    } catch (error) {
      console.error("Error deleting file:", error);
    }

    // Delete database record
    await prisma.attachment.delete({
      where: { id },
    });

    return apiResponse(null, "Attachment deleted successfully");
  } catch (error) {
    console.error("Delete attachment error:", error);
    return apiError("Failed to delete attachment", 500);
  }
}
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
