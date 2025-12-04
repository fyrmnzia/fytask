import jwt, { Secret, SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { User } from "@/app/generated/prisma/client";
import { randomBytes } from "crypto";

const JWT_SECRET: Secret = process.env.JWT_SECRET || "fallback-secret-change-me";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "1h") as SignOptions["expiresIn"];

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
}

export const authHelpers = {
  // Password hashing
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  // JWT operations
  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  },

  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  },

  // Session management
  async createSession(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{ token: string; session: any }> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const session = await prisma.session.create({
      data: {
        userId,
        token: this.generateRandomToken(),
        deviceInfo,
        ipAddress,
        expiresAt,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) throw new Error("User not found");

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      sessionId: session.id,
    });

    return { token, session };
  },

  async validateSession(token: string): Promise<User | null> {
    const payload = this.verifyToken(token);
    if (!payload) return null;

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.user;
  },

  async revokeSession(sessionId: string): Promise<void> {
    await prisma.session.delete({
      where: { id: sessionId },
    });
  },

  async revokeAllSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  },

  // Random token generation
  generateRandomToken(): string {
    return randomBytes(32).toString("hex");
  },

  // Verify email token
  generateVerifyToken(): string {
    return this.generateRandomToken();
  },

  // Password reset token
  generateResetToken(): string {
    return this.generateRandomToken();
  },
};

// Middleware helper to extract user from request
export async function getUserFromRequest(authHeader: string | null): Promise<User | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  return authHelpers.validateSession(token);
}
