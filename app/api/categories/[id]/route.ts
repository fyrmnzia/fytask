import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validate, updateCategorySchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";
import { redisHelpers } from "@/lib/redis";

// PUT /api/categories/[id]
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;
    const body = await request.json();

    const existing = await prisma.category.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return apiError("Category not found", 404);
    }

    const validation = validate(updateCategorySchema, body);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const data = validation.data;

    // Check for duplicate name if changing name
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.category.findFirst({
        where: {
          userId: user.id,
          name: { equals: data.name, mode: "insensitive" },
          id: { not: id },
        },
      });

      if (duplicate) {
        return apiError("Category with this name already exists", 400);
      }
    }

    // Prevent circular parent reference
    if (data.parentId) {
      if (data.parentId === id) {
        return apiError("Category cannot be its own parent", 400);
      }

      // Check if new parent is a child of this category
      const descendants = await getDescendants(id);
      if (descendants.includes(data.parentId)) {
        return apiError("Cannot set a descendant as parent", 400);
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data,
      include: {
        children: true,
        parent: true,
      },
    });

    // Invalidate cache
    await redisHelpers.deleteCached(`categories:${user.id}`);

    return apiResponse(category, "Category updated successfully");
  } catch (error) {
    console.error("Update category error:", error);
    return apiError("Failed to update category", 500);
  }
}

// DELETE /api/categories/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { id } = params;

    const category = await prisma.category.findFirst({
      where: { id, userId: user.id },
      include: {
        children: true,
        _count: {
          select: {
            tasks: true,
            notes: true,
          },
        },
      },
    });

    if (!category) {
      return apiError("Category not found", 404);
    }

    // Check if category has children
    if (category.children.length > 0) {
      return apiError("Cannot delete category with subcategories", 400);
    }

    // Unassign tasks and notes
    await prisma.task.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await prisma.note.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    // Delete category
    await prisma.category.delete({
      where: { id },
    });

    // Invalidate cache
    await redisHelpers.deleteCached(`categories:${user.id}`);

    return apiResponse(null, "Category deleted successfully");
  } catch (error) {
    console.error("Delete category error:", error);
    return apiError("Failed to delete category", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// Helper to get all descendants
async function getDescendants(categoryId: string): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });

  const childIds = children.map((c) => c.id);
  const descendants = [...childIds];

  for (const childId of childIds) {
    const childDescendants = await getDescendants(childId);
    descendants.push(...childDescendants);
  }

  return descendants;
}
