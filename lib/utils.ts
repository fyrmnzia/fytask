import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting
export function formatDate(
  date: Date | string,
  format: "short" | "long" | "relative" = "short"
): string {
  const d = new Date(date);

  if (format === "relative") {
    return formatRelativeTime(d);
  }

  if (format === "long") {
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// File size formatting
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

// Generate random color
export function generateRandomColor(): string {
  const colors = [
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#84CC16", // lime
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Sleep function
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate slug from text
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy:", error);
    return false;
  }
}

// Priority color mapping
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
    MEDIUM: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
    HIGH: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
    URGENT: "text-red-600 bg-red-100 dark:bg-red-900/30",
  };
  return colors[priority] || colors.MEDIUM;
}

// Status color mapping
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    TODO: "text-gray-600 bg-gray-100 dark:bg-gray-800",
    IN_PROGRESS: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
    COMPLETED: "text-green-600 bg-green-100 dark:bg-green-900/30",
    CANCELLED: "text-red-600 bg-red-100 dark:bg-red-900/30",
  };
  return colors[status] || colors.TODO;
}

// API response helper
export function apiResponse<T>(data: T, message?: string, status: number = 200) {
  return Response.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

export function apiError(error: string, status: number = 400, details?: any) {
  return Response.json(
    {
      success: false,
      error,
      details,
    },
    { status }
  );
}
