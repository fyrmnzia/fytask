"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useNotes } from "@/hooks/use-notes";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Grid, List, Pin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuthStore } from "@/store/auth-store";

function NotesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = searchParams.get("id");
  const newNote = searchParams.get("new");
  const token = useAuthStore((state) => state.token);

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showEditor, setShowEditor] = useState(false);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  const debouncedSearch = useDebounce(search, 300);

  const queryParams: any = {
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { notes, isLoading, mutate } = useNotes(queryParams);

  useEffect(() => {
    if (newNote === "true") {
      setShowEditor(true);
      router.replace("/notes");
    }
    fetchCategoriesAndTags();
  }, [newNote, router]);

  const fetchCategoriesAndTags = async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        fetch("/api/categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/tags", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [catData, tagData] = await Promise.all([catRes.json(), tagRes.json()]);

      if (catData.success) setCategories(catData.data);
      if (tagData.success) setTags(tagData.data);
    } catch (error) {
      console.error("Failed to fetch categories/tags");
    }
  };

  const handleSuccess = () => {
    setShowEditor(false);
    mutate();
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground mt-1">Capture your thoughts and ideas</p>
        </div>
        <Button onClick={() => setShowEditor(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notes Display */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No notes found</p>
          <Button onClick={() => setShowEditor(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create your first note
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Pin className="h-5 w-5 fill-primary text-primary" />
                Pinned
              </h2>
              <div
                className={
                  view === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"
                }
              >
                <AnimatePresence mode="popLayout">
                  {pinnedNotes.map((note) => (
                    <NoteCard key={note.id} note={note} onUpdate={mutate} onDelete={mutate} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Other Notes */}
          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && <h2 className="text-lg font-semibold mb-4">All Notes</h2>}
              <div
                className={
                  view === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"
                }
              >
                <AnimatePresence mode="popLayout">
                  {unpinnedNotes.map((note) => (
                    <NoteCard key={note.id} note={note} onUpdate={mutate} onDelete={mutate} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Note Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <NoteEditor
            categories={categories}
            tags={tags}
            onSuccess={handleSuccess}
            onCancel={() => setShowEditor(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotesPageContent />
    </Suspense>
  );
}
