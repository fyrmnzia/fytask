import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelpers } from "@/lib/auth";
import { validate, loginSchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import { rateLimitMiddleware, corsHeaders } from "@/lib/api-middleware";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(request, "login");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = validate(loginSchema, body);

    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const { email, password } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return apiError("Invalid email or password", 401);
    }

    // Verify password
    const isValidPassword = await authHelpers.comparePassword(password, user.password);

    if (!isValidPassword) {
      return apiError("Invalid email or password", 401);
    }

    // Check email verification
    if (!user.emailVerified) {
      return apiError("Please verify your email before logging in", 403);
    }

    // Get device info
    const userAgent = request.headers.get("user-agent") || undefined;
    const ip =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;

    // Create session
    const { token, session } = await authHelpers.createSession(user.id, userAgent, ip);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Return user without password
    const { password: _, resetToken, resetExpires, verifyToken, ...userSafe } = user;

    return apiResponse(
      {
        user: userSafe,
        token,
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      },
      "Login successful"
    );
  } catch (error) {
    console.error("Login error:", error);
    return apiError("Login failed", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
