import { NextRequest } from "next/server";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    // Remove sensitive fields
    const { password, resetToken, resetExpires, verifyToken, ...userSafe } = user;

    return apiResponse({ user: userSafe });
  } catch (error) {
    console.error("Get user error:", error);
    return apiError("Failed to get user", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
