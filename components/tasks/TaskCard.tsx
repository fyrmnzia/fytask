"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, getPriorityColor, getStatusColor, cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Calendar, Tag, Paperclip, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { motion } from "framer-motion";

interface TaskCardProps {
  task: TaskWithRelations;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export function TaskCard({ task, onUpdate, onDelete }: TaskCardProps) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);

    try {
      const newStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success(newStatus === "COMPLETED" ? "Task completed!" : "Task reopened");
      onUpdate?.();
    } catch (error) {
      toast.error("Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Task moved to trash");
      onDelete?.();
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const completedSubtasks = task.subtasks.filter((st) => st.isCompleted).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          task.status === "COMPLETED" && "opacity-60"
        )}
        onClick={() => router.push(`/tasks?id=${task.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <button onClick={handleToggleComplete} disabled={isUpdating} className="mt-1">
              {task.status === "COMPLETED" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
              )}
            </button>

            <div className="flex-1 space-y-1">
              <CardTitle
                className={cn(
                  "text-lg leading-tight",
                  task.status === "COMPLETED" && "line-through"
                )}
              >
                {task.title}
              </CardTitle>
              {task.description && (
                <CardDescription className="line-clamp-2">{task.description}</CardDescription>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/tasks?id=${task.id}`)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-2">
            <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
            <Badge className={getStatusColor(task.status)}>{task.status.replace("_", " ")}</Badge>
            {task.category && (
              <Badge variant="outline" style={{ borderColor: task.category.color }}>
                {task.category.icon} {task.category.name}
              </Badge>
            )}
          </div>

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.map(({ tag }) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {totalSubtasks > 0 && (
            <div className="mt-3 text-sm text-muted-foreground">
              <CheckCircle2 className="inline h-4 w-4 mr-1" />
              {completedSubtasks}/{totalSubtasks} subtasks completed
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0 flex items-center gap-4 text-sm text-muted-foreground">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(task.dueDate)}
            </div>
          )}
          {task.attachments.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="h-4 w-4" />
              {task.attachments.length}
            </div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
