import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";

// DELETE /api/reminders/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;

    const reminder = await prisma.reminder.findFirst({
      where: { id, userId: user.id },
    });

    if (!reminder) {
      return apiError("Reminder not found", 404);
    }

    await prisma.reminder.delete({
      where: { id },
    });

    return apiResponse(null, "Reminder deleted successfully");
  } catch (error) {
    console.error("Delete reminder error:", error);
    return apiError("Failed to delete reminder", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
