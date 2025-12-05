"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, cn } from "@/lib/utils";
import type { NoteWithRelations } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pin, Tag, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { motion } from "framer-motion";

interface NoteCardProps {
  note: NoteWithRelations;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export function NoteCard({ note, onUpdate, onDelete }: NoteCardProps) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success(note.isPinned ? "Note unpinned" : "Note pinned");
      onUpdate?.();
    } catch (error) {
      toast.error("Failed to update note");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Note moved to trash");
      onDelete?.();
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const getPreview = (content: string, maxLength: number = 150) => {
    // Remove markdown syntax for preview
    const plain = content
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .trim();

    return plain.length > maxLength ? plain.substring(0, maxLength) + "..." : plain;
  };

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
          note.isPinned && "border-primary"
        )}
        onClick={() => router.push(`/notes?id=${note.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                {note.isPinned && <Pin className="h-4 w-4 text-primary fill-primary" />}
                <CardTitle className="text-lg leading-tight">{note.title}</CardTitle>
              </div>
              <CardDescription className="line-clamp-3">{getPreview(note.content)}</CardDescription>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleTogglePin}>
                  {note.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/notes?id=${note.id}`)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {(note.category || note.tags.length > 0 || note.attachments.length > 0) && (
          <CardContent className="pb-3">
            <div className="flex flex-wrap gap-2">
              {note.category && (
                <Badge variant="outline" style={{ borderColor: note.category.color }}>
                  {note.category.icon} {note.category.name}
                </Badge>
              )}
            </div>

            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {note.tags.map(({ tag }) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        )}

        <CardFooter className="pt-0 flex items-center gap-4 text-sm text-muted-foreground">
          <div>Updated {formatDate(note.updatedAt, "relative")}</div>
          {note.attachments.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="h-4 w-4" />
              {note.attachments.length}
            </div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
