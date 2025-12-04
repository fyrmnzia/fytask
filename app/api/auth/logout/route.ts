import { NextRequest } from "next/server";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";
import { authHelpers } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const authHeader = request.headers.get("authorization");

    if (authHeader) {
      const token = authHeader.substring(7);
      const payload = authHelpers.verifyToken(token);

      if (payload) {
        await authHelpers.revokeSession(payload.sessionId);
      }
    }

    return apiResponse(null, "Logout successful");
  } catch (error) {
    console.error("Logout error:", error);
    return apiError("Logout failed", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
