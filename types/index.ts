import {
  User,
  Task,
  Subtask,
  Note,
  Category,
  Tag,
  Reminder,
  Attachment,
  ActivityLog,
  APIKey,
  Session,
  Priority,
  TaskStatus,
  ActivityAction,
} from "@/app/generated/prisma/client";

// Re-export Prisma types
export type {
  User,
  Task,
  Subtask,
  Note,
  Category,
  Tag,
  Reminder,
  Attachment,
  ActivityLog,
  APIKey,
  Session,
  Priority,
  TaskStatus,
  ActivityAction,
};

// Extended types with relations
export type TaskWithRelations = Task & {
  category?: Category | null;
  tags: (TaskTag & { tag: Tag })[];
  subtasks: Subtask[];
  reminders: Reminder[];
  attachments: Attachment[];
};

export type NoteWithRelations = Note & {
  category?: Category | null;
  tags: (NoteTag & { tag: Tag })[];
  attachments: Attachment[];
};

export type CategoryWithChildren = Category & {
  children: Category[];
  parent?: Category | null;
};

export type UserSafe = Omit<User, "password" | "resetToken" | "verifyToken">;

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard stats
export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalNotes: number;
  todayTasks: number;
  weekTasks: number;
  completionRate: number;
  productivityScore: number;
}

// Calendar event
export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "task" | "reminder";
  priority?: Priority;
  status?: TaskStatus;
}

// Activity heatmap
export interface ActivityHeatmap {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // 0 = no activity, 4 = high activity
}

// Realtime message
export interface RealtimeMessage {
  type:
    | "task.created"
    | "task.updated"
    | "task.deleted"
    | "note.created"
    | "note.updated"
    | "note.deleted";
  userId: string;
  data: any;
  timestamp: Date;
}

// Webhook payload
export interface WebhookPayload {
  event: string;
  userId: string;
  data: any;
  timestamp: string;
}

// Import/Export data structure
export interface ExportData {
  version: string;
  exportedAt: string;
  user: {
    email: string;
    username?: string;
    name?: string;
  };
  tasks: Task[];
  notes: Note[];
  categories: Category[];
  tags: Tag[];
}

// Task junction type
export interface TaskTag {
  taskId: string;
  tagId: string;
  tag: Tag;
}

// Note junction type
export interface NoteTag {
  noteId: string;
  tagId: string;
  tag: Tag;
}
