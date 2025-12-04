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
    const limit = parseInt(searchParams.get("limit") || "20");

    const activities = await prisma.activityLog.findMany({
      where: { userId: user.id },
      include: {
        task: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return apiResponse(activities);
  } catch (error) {
    console.error("Get activity error:", error);
    return apiError("Failed to fetch activity", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
