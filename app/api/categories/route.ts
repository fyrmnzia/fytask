import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validate, createCategorySchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";
import { redisHelpers } from "@/lib/redis";

// GET /api/categories
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    // Check cache
    const cacheKey = `categories:${user.id}`;
    const cached = await redisHelpers.getCached<any[]>(cacheKey);

    if (cached) {
      return apiResponse(cached);
    }

    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      include: {
        children: true,
        parent: true,
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
    await redisHelpers.setCached(cacheKey, categories, 300);

    return apiResponse(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    return apiError("Failed to fetch categories", 500);
  }
}

// POST /api/categories
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const body = await request.json();

    const validation = validate(createCategorySchema, body);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const data = validation.data;

    // Check for duplicate name
    const existing = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: { equals: data.name, mode: "insensitive" },
      },
    });

    if (existing) {
      return apiError("Category with this name already exists", 400);
    }

    // Verify parent exists if provided
    if (data.parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: data.parentId, userId: user.id },
      });
      if (!parent) {
        return apiError("Parent category not found", 404);
      }
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon,
        parentId: data.parentId,
        userId: user.id,
      },
      include: {
        children: true,
        parent: true,
      },
    });

    // Invalidate cache
    await redisHelpers.deleteCached(`categories:${user.id}`);

    return apiResponse(category, "Category created successfully", 201);
  } catch (error) {
    console.error("Create category error:", error);
    return apiError("Failed to create category", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
