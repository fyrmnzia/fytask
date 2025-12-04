import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validate, createSubtaskSchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id: taskId } = params;
    const body = await request.json();

    // Verify task ownership
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    });

    if (!task) {
      return apiError("Task not found", 404);
    }

    const validation = validate(createSubtaskSchema, body);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const subtask = await prisma.subtask.create({
      data: {
        ...validation.data,
        taskId,
      },
    });

    return apiResponse(subtask, "Subtask created successfully", 201);
  } catch (error) {
    console.error("Create subtask error:", error);
    return apiError("Failed to create subtask", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
