import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validate, updateTaskSchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";
import { redisHelpers } from "@/lib/redis";

// GET /api/tasks/[id] - Get single task
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;

    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
        subtasks: {
          orderBy: { position: "asc" },
        },
        reminders: true,
        attachments: true,
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!task) {
      return apiError("Task not found", 404);
    }

    return apiResponse(task);
  } catch (error) {
    console.error("Get task error:", error);
    return apiError("Failed to fetch task", 500);
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;
    const body = await request.json();

    // Check task exists and belongs to user
    const existingTask = await prisma.task.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingTask) {
      return apiError("Task not found", 404);
    }

    const validation = validate(updateTaskSchema, body);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const data = validation.data;

    // Handle tags separately
    const tagIds = data.tagIds;
    delete (data as any).tagIds;

    // Update task
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        snoozedUntil: data.snoozedUntil ? new Date(data.snoozedUntil) : undefined,
        completedAt: data.status === "COMPLETED" ? new Date() : undefined,
        tags: tagIds
          ? {
              deleteMany: {},
              create: tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
        subtasks: true,
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        action: "UPDATED",
        entityType: "Task",
        entityId: task.id,
        taskId: task.id,
        userId: user.id,
        changes: body,
      },
    });

    // Publish realtime update
    await redisHelpers.publish(`user:${user.id}:tasks`, {
      type: "task.updated",
      data: task,
    });

    // Invalidate cache
    await redisHelpers.deleteCachedPattern(`tasks:${user.id}:*`);

    return apiResponse(task, "Task updated successfully");
  } catch (error) {
    console.error("Update task error:", error);
    return apiError("Failed to update task", 500);
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;

    // Check task exists and belongs to user
    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
    });

    if (!task) {
      return apiError("Task not found", 404);
    }

    // Soft delete (move to trash)
    await prisma.task.update({
      where: { id },
      data: {
        isTrashed: true,
        trashedAt: new Date(),
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        action: "DELETED",
        entityType: "Task",
        entityId: id,
        userId: user.id,
      },
    });

    // Publish realtime update
    await redisHelpers.publish(`user:${user.id}:tasks`, {
      type: "task.deleted",
      data: { id },
    });

    // Invalidate cache
    await redisHelpers.deleteCachedPattern(`tasks:${user.id}:*`);

    return apiResponse(null, "Task moved to trash");
  } catch (error) {
    console.error("Delete task error:", error);
    return apiError("Failed to delete task", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
