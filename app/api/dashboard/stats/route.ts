import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";
import { redisHelpers } from "@/lib/redis";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    // Check cache
    const cacheKey = `dashboard:stats:${user.id}`;
    const cached = await redisHelpers.getCached<any>(cacheKey);

    if (cached) {
      return apiResponse(cached);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get task counts
    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      todayTasks,
      weekTasks,
      totalNotes,
    ] = await Promise.all([
      prisma.task.count({
        where: { userId: user.id, isTrashed: false },
      }),
      prisma.task.count({
        where: { userId: user.id, status: "COMPLETED", isTrashed: false },
      }),
      prisma.task.count({
        where: { userId: user.id, status: "IN_PROGRESS", isTrashed: false },
      }),
      prisma.task.count({
        where: {
          userId: user.id,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: { lt: now },
          isTrashed: false,
        },
      }),
      prisma.task.count({
        where: {
          userId: user.id,
          dueDate: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
          isTrashed: false,
        },
      }),
      prisma.task.count({
        where: {
          userId: user.id,
          dueDate: { gte: weekAgo },
          isTrashed: false,
        },
      }),
      prisma.note.count({
        where: { userId: user.id, isTrashed: false },
      }),
    ]);

    // Calculate completion rate
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate productivity score (simple algorithm)
    const productivityScore = Math.min(
      100,
      Math.round((completedTasks * 10 + inProgressTasks * 5) / Math.max(totalTasks, 1))
    );

    const stats = {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalNotes,
      todayTasks,
      weekTasks,
      completionRate: Math.round(completionRate),
      productivityScore,
    };

    // Cache for 2 minutes
    await redisHelpers.setCached(cacheKey, stats, 120);

    return apiResponse(stats);
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    return apiError("Failed to fetch dashboard stats", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
