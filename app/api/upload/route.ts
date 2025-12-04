import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/utils";
import { authenticateRequest, corsHeaders } from "@/lib/api-middleware";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "5242880"); // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
];

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const formData = await request.formData();

    const file = formData.get("file") as File;
    const taskId = formData.get("taskId") as string | null;
    const noteId = formData.get("noteId") as string | null;

    if (!file) {
      return apiError("No file provided", 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return apiError(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`, 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError("File type not allowed", 400);
    }

    // Verify ownership if taskId or noteId provided
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId: user.id },
      });
      if (!task) return apiError("Task not found", 404);
    }

    if (noteId) {
      const note = await prisma.note.findFirst({
        where: { id: noteId, userId: user.id },
      });
      if (!note) return apiError("Note not found", 404);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const extension = originalName.split(".").pop();
    const filename = `${user.id}_${timestamp}.${extension}`;

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = join(UPLOAD_DIR, filename);
    await writeFile(filepath, buffer);

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        filename,
        originalName,
        mimeType: file.type,
        size: file.size,
        url: `/uploads/${filename}`,
        userId: user.id,
        taskId,
        noteId,
      },
    });

    return apiResponse(attachment, "File uploaded successfully", 201);
  } catch (error) {
    console.error("Upload error:", error);
    return apiError("Failed to upload file", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
