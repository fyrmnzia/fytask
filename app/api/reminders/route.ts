import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validate, createReminderSchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";

// GET /api/reminders
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const searchParams = request.nextUrl.searchParams;
    const upcoming = searchParams.get("upcoming") === "true";

    const where: any = {
      userId: user.id,
      isSent: false,
    };

    if (upcoming) {
      where.remindAt = {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
      };
    }

    const reminders = await prisma.reminder.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            priority: true,
          },
        },
      },
      orderBy: { remindAt: "asc" },
    });

    return apiResponse(reminders);
  } catch (error) {
    console.error("Get reminders error:", error);
    return apiError("Failed to fetch reminders", 500);
  }
}

// POST /api/reminders
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const body = await request.json();

    const validation = validate(createReminderSchema, body);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const data = validation.data;

    // Verify task if provided
    if (data.taskId) {
      const task = await prisma.task.findFirst({
        where: { id: data.taskId, userId: user.id },
      });
      if (!task) {
        return apiError("Task not found", 404);
      }
    }

    const reminder = await prisma.reminder.create({
      data: {
        remindAt: new Date(data.remindAt),
        message: data.message,
        method: data.method,
        taskId: data.taskId,
        userId: user.id,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return apiResponse(reminder, "Reminder created successfully", 201);
  } catch (error) {
    console.error("Create reminder error:", error);
    return apiError("Failed to create reminder", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
