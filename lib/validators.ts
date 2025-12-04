import { z } from "zod";

// Auth validators
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const updatePasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Task validators
export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("TODO"),
  dueDate: z.string().datetime().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional().nullable(),
  snoozedUntil: z.string().datetime().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

// Subtask validators
export const createSubtaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  position: z.number().int().min(0).default(0),
});

export const updateSubtaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long").optional(),
  isCompleted: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

// Note validators
export const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  content: z.string().min(1, "Content is required"),
  categoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
  isPinned: z.boolean().default(false),
});

export const updateNoteSchema = createNoteSchema.partial();

// Category validators
export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  icon: z.string().max(10).optional(),
  parentId: z.string().optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

// Tag validators
export const createTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(30, "Name too long"),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid hex color")
    .default("#6B7280"),
});

export const updateTagSchema = createTagSchema.partial();

// Reminder validators
export const createReminderSchema = z.object({
  remindAt: z.string().datetime(),
  message: z.string().max(255).optional(),
  method: z.enum(["notification", "email", "both"]).default("notification"),
  taskId: z.string().optional().nullable(),
});

export const updateReminderSchema = createReminderSchema.partial();

// API Key validators
export const createAPIKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  expiresAt: z.string().datetime().optional().nullable(),
});

// Query validators
export const taskQuerySchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
  search: z.string().optional(),
  includeArchived: z.boolean().default(false),
  includeTrashed: z.boolean().default(false),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "dueDate", "priority"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const noteQuerySchema = z.object({
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
  search: z.string().optional(),
  isPinned: z.boolean().optional(),
  includeArchived: z.boolean().default(false),
  includeTrashed: z.boolean().default(false),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Helper function to validate data
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
      };
    }
    return { success: false, error: "Validation failed" };
  }
}
