import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validate, createNoteSchema, noteQuerySchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import {
  authenticateRequest,
  corsHeaders,
  parsePagination,
  buildPaginationMeta,
} from "@/lib/api-middleware";
import { redisHelpers } from "@/lib/redis";

// GET /api/notes - List notes
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const searchParams = request.nextUrl.searchParams;

    const queryData = {
      categoryId: searchParams.get("categoryId") || undefined,
      tagId: searchParams.get("tagId") || undefined,
      search: searchParams.get("search") || undefined,
      isPinned: searchParams.get("isPinned") === "true" ? true : undefined,
      includeArchived: searchParams.get("includeArchived") === "true",
      includeTrashed: searchParams.get("includeTrashed") === "true",
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      sortBy: searchParams.get("sortBy") || "updatedAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    };
    const validation = validate(noteQuerySchema, queryData);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const query = validation.data;
    const { page, limit, skip } = parsePagination(searchParams);

    const where: any = {
      userId: user.id,
    };

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.isPinned !== undefined) where.isPinned = query.isPinned;
    if (!query.includeArchived) where.isArchived = false;
    if (!query.includeTrashed) where.isTrashed = false;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { content: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.tagId) {
      where.tags = {
        some: { tagId: query.tagId },
      };
    }

    const total = await prisma.note.count({ where });

    const notes = await prisma.note.findMany({
      where,
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
        attachments: true,
      },
      skip,
      take: limit,
      orderBy: { [query.sortBy]: query.sortOrder },
    });

    return apiResponse({
      items: notes,
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("Get notes error:", error);
    return apiError("Failed to fetch notes", 500);
  }
}
// POST /api/notes - Create note
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;
    const body = await request.json();

    const validation = validate(createNoteSchema, body);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const data = validation.data;

    const note = await prisma.note.create({
      data: {
        title: data.title,
        content: data.content,
        categoryId: data.categoryId,
        isPinned: data.isPinned,
        userId: user.id,
        tags: data.tagIds
          ? {
              create: data.tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
        versions: {
          create: {
            content: data.content,
            version: 1,
          },
        },
      },
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    // Publish realtime update
    await redisHelpers.publish(`user:${user.id}:notes`, {
      type: "note.created",
      data: note,
    });

    // Invalidate cache
    await redisHelpers.deleteCachedPattern(`notes:${user.id}:*`);

    return apiResponse(note, "Note created successfully", 201);
  } catch (error) {
    console.error("Create note error:", error);
    return apiError("Failed to create note", 500);
  }
}
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
