import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validate, createTaskSchema, taskQuerySchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import {
  authenticateRequest,
  corsHeaders,
  parsePagination,
  buildPaginationMeta,
} from "@/lib/api-middleware";
import { redisHelpers } from "@/lib/redis";
import { parseNaturalLanguageTask } from "@/lib/nlp-parser";

// GET /api/tasks - List tasks
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const searchParams = request.nextUrl.searchParams;

    // Parse query params
    const queryData = {
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      tagId: searchParams.get("tagId") || undefined,
      search: searchParams.get("search") || undefined,
      includeArchived: searchParams.get("includeArchived") === "true",
      includeTrashed: searchParams.get("includeTrashed") === "true",
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    };

    const validation = validate(taskQuerySchema, queryData);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const query = validation.data;
    const { page, limit, skip } = parsePagination(searchParams);

    // Build where clause
    const where: any = {
      userId: user.id,
    };

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (!query.includeArchived) where.isArchived = false;
    if (!query.includeTrashed) where.isTrashed = false;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.tagId) {
      where.tags = {
        some: { tagId: query.tagId },
      };
    }

    // Get total count
    const total = await prisma.task.count({ where });

    // Get tasks
    const tasks = await prisma.task.findMany({
      where,
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
        subtasks: {
          orderBy: { position: "asc" },
        },
        reminders: {
          where: { isSent: false },
        },
        attachments: true,
      },
      skip,
      take: limit,
      orderBy: { [query.sortBy]: query.sortOrder },
    });

    return apiResponse({
      items: tasks,
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    return apiError("Failed to fetch tasks", 500);
  }
}

// POST /api/tasks - Create task
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const body = await request.json();

    // Check if using natural language input
    if (body.naturalLanguage) {
      const parsed = parseNaturalLanguageTask(body.naturalLanguage);
      body.title = parsed.title;
      if (parsed.dueDate) body.dueDate = parsed.dueDate.toISOString();
      if (parsed.priority) body.priority = parsed.priority;
      if (parsed.tags) body.tagIds = await getOrCreateTags(user.id, parsed.tags);
    }

    const validation = validate(createTaskSchema, body);
    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const data = validation.data;

    // Create task
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        categoryId: data.categoryId,
        isRecurring: data.isRecurring,
        recurrenceRule: data.recurrenceRule,
        userId: user.id,
        tags: data.tagIds
          ? {
              create: data.tagIds.map((tagId) => ({ tagId })),
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
        action: "CREATED",
        entityType: "Task",
        entityId: task.id,
        taskId: task.id,
        userId: user.id,
      },
    });

    // Publish realtime update
    await redisHelpers.publish(`user:${user.id}:tasks`, {
      type: "task.created",
      data: task,
    });

    // Invalidate cache
    await redisHelpers.deleteCachedPattern(`tasks:${user.id}:*`);

    return apiResponse(task, "Task created successfully", 201);
  } catch (error) {
    console.error("Create task error:", error);
    return apiError("Failed to create task", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// Helper function to get or create tags
async function getOrCreateTags(userId: string, tagNames: string[]): Promise<string[]> {
  const tagIds: string[] = [];

  for (const name of tagNames) {
    let tag = await prisma.tag.findFirst({
      where: { userId, name: { equals: name, mode: "insensitive" } },
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: { userId, name },
      });
    }

    tagIds.push(tag.id);
  }

  return tagIds;
}
