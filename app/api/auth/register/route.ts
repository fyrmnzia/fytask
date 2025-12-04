import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelpers } from "@/lib/auth";
import { emailService } from "@/lib/email";
import { validate, registerSchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import { rateLimitMiddleware, corsHeaders } from "@/lib/api-middleware";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(request, "register");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = validate(registerSchema, body);

    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const { email, password, username, name } = validation.data;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(username ? [{ username }] : [])],
      },
    });

    if (existingUser) {
      return apiError(
        existingUser.email === email ? "Email already registered" : "Username already taken",
        400
      );
    }

    // Hash password
    const hashedPassword = await authHelpers.hashPassword(password);

    // Generate verification token
    const verifyToken = authHelpers.generateVerifyToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        name,
        verifyToken,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Send verification email
    await emailService.sendVerificationEmail(email, verifyToken);

    return apiResponse(
      { user },
      "Registration successful! Please check your email to verify your account.",
      201
    );
  } catch (error) {
    console.error("Register error:", error);
    return apiError("Registration failed", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
