import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validate, createTagSchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";
import { redisHelpers } from "@/lib/redis";

// GET /api/tags
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    // Check cache
    const cacheKey = `tags:${user.id}`;
    const cached = await redisHelpers.getCached<any[]>(cacheKey);

    if (cached) {
      return apiResponse(cached);
    }

    const tags = await prisma.tag.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            tasks: true,
            notes: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Cache for 5 minutes
    await redisHelpers.setCached(cacheKey, tags, 300);

    return apiResponse(tags);
  } catch (error) {
    console.error("Get tags error:", error);
    return apiError("Failed to fetch tags", 500);
  }
}

// POST /api/tags
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const body = await request.json();

    const validation = validate(createTagSchema, body);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const data = validation.data;

    // Check for duplicate
    const existing = await prisma.tag.findFirst({
      where: {
        userId: user.id,
        name: { equals: data.name, mode: "insensitive" },
      },
    });

    if (existing) {
      return apiError("Tag with this name already exists", 400);
    }

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        color: data.color,
        userId: user.id,
      },
    });

    // Invalidate cache
    await redisHelpers.deleteCached(`tags:${user.id}`);

    return apiResponse(tag, "Tag created successfully", 201);
  } catch (error) {
    console.error("Create tag error:", error);
    return apiError("Failed to create tag", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
