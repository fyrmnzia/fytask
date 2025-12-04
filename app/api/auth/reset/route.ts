import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelpers } from "@/lib/auth";
import { emailService } from "@/lib/email";
import { validate, resetPasswordSchema, updatePasswordSchema } from "@/lib/validators";
import { apiResponse, apiError } from "@/lib/utils";
import { rateLimitMiddleware, corsHeaders } from "@/lib/api-middleware";

// Request password reset
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(request, "reset");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = validate(resetPasswordSchema, body);

    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const { email } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return apiResponse(null, "If the email exists, a reset link has been sent");
    }

    // Generate reset token
    const resetToken = authHelpers.generateResetToken();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires },
    });

    // Send reset email
    await emailService.sendPasswordResetEmail(email, resetToken);

    return apiResponse(null, "If the email exists, a reset link has been sent");
  } catch (error) {
    console.error("Reset request error:", error);
    return apiError("Reset request failed", 500);
  }
}

// Update password with token
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validate(updatePasswordSchema, body);

    if (!validation.success) {
      return apiError(validation.error, 400);
    }

    const { token, password } = validation.data;

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return apiError("Invalid or expired reset token", 400);
    }

    // Hash new password
    const hashedPassword = await authHelpers.hashPassword(password);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetExpires: null,
      },
    });

    // Revoke all sessions for security
    await authHelpers.revokeAllSessions(user.id);

    return apiResponse(null, "Password updated successfully");
  } catch (error) {
    console.error("Password update error:", error);
    return apiError("Password update failed", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
