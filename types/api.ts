// Request types
export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  token: string;
  password: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status?: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  dueDate?: string;
  categoryId?: string;
  tagIds?: string[];
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  isArchived?: boolean;
  isTrashed?: boolean;
  snoozedUntil?: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  categoryId?: string;
  tagIds?: string[];
  isPinned?: boolean;
}

export interface UpdateNoteRequest extends Partial<CreateNoteRequest> {
  isArchived?: boolean;
  isTrashed?: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  color: string;
  icon?: string;
  parentId?: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface CreateReminderRequest {
  remindAt: string;
  message?: string;
  method?: "notification" | "email" | "both";
  taskId?: string;
}

export interface CreateAPIKeyRequest {
  name: string;
  expiresAt?: string;
}

// Query parameters
export interface TaskQueryParams {
  status?: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  categoryId?: string;
  tagId?: string;
  search?: string;
  includeArchived?: boolean;
  includeTrashed?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "dueDate" | "priority";
  sortOrder?: "asc" | "desc";
}

export interface NoteQueryParams {
  categoryId?: string;
  tagId?: string;
  search?: string;
  isPinned?: boolean;
  includeArchived?: boolean;
  includeTrashed?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "title";
  sortOrder?: "asc" | "desc";
}
