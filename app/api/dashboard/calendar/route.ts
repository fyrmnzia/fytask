import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const searchParams = request.nextUrl.searchParams;

    const month = parseInt(searchParams.get("month") || String(new Date().getMonth()));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    // Get tasks with due dates
    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
        isTrashed: false,
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        status: true,
      },
      orderBy: { dueDate: "asc" },
    });

    // Get reminders
    const reminders = await prisma.reminder.findMany({
      where: {
        userId: user.id,
        remindAt: {
          gte: startDate,
          lte: endDate,
        },
        isSent: false,
      },
      select: {
        id: true,
        remindAt: true,
        message: true,
        task: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { remindAt: "asc" },
    });

    const events = [
      ...tasks.map((task) => ({
        id: task.id,
        title: task.title,
        date: task.dueDate,
        type: "task" as const,
        priority: task.priority,
        status: task.status,
      })),
      ...reminders.map((reminder) => ({
        id: reminder.id,
        title: reminder.task?.title || reminder.message || "Reminder",
        date: reminder.remindAt,
        type: "reminder" as const,
      })),
    ].sort((a, b) => {
      const aTime = a.date ? a.date.getTime() : Infinity;
      const bTime = b.date ? b.date.getTime() : Infinity;
      return aTime - bTime;
    });

    return apiResponse(events);
  } catch (error) {
    console.error("Get calendar error:", error);
    return apiError("Failed to fetch calendar data", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
