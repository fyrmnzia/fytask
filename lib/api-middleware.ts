import { NextRequest } from "next/server";
import { getUserFromRequest } from "./auth";
import { redisHelpers } from "./redis";
import { apiError } from "./utils";
import type { User } from "@/app/generated/prisma/client";
import { prisma } from "./prisma";

export interface AuthenticatedRequest extends NextRequest {
  user?: User;
}

// Rate limiting middleware
export async function rateLimitMiddleware(
  request: NextRequest,
  identifier: string = "global"
): Promise<Response | null> {
  const ip =
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const key = `ratelimit:${identifier}:${ip}`;

  const max = parseInt(process.env.RATE_LIMIT_MAX || "100");
  const window = parseInt(process.env.RATE_LIMIT_WINDOW || "900000") / 1000; // Convert to seconds

  const allowed = await redisHelpers.checkRateLimit(key, max, window);

  if (!allowed) {
    return apiError("Too many requests. Please try again later.", 429);
  }

  return null;
}

// Authentication middleware
export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: User } | Response> {
  const authHeader = request.headers.get("authorization");
  const user = await getUserFromRequest(authHeader);

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  return { user };
}

// API Key authentication middleware
export async function authenticateAPIKey(
  request: NextRequest
): Promise<{ userId: string } | Response> {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return apiError("API key required", 401);
  }

  const key = await prisma.aPIKey.findUnique({
    where: { key: apiKey, isActive: true },
  });

  if (!key || (key.expiresAt && key.expiresAt < new Date())) {
    return apiError("Invalid or expired API key", 401);
  }

  // Update last used
  await prisma.aPIKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return { userId: key.userId };
}

// CORS headers
export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  };
}

// Handle OPTIONS request
export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// Pagination helper
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

// Build pagination response
export function buildPaginationMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
