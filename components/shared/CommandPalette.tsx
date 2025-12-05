"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Plus,
  Search,
  Settings,
  Tag,
  Folder,
} from "lucide-react";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { debounce } from "@/lib/utils";

export function CommandPalette() {
  const { t } = useTranslation();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Global keyboard shortcut
  useHotkeys("ctrl+k,cmd+k", () => {
    setCommandPaletteOpen(true);
  });

  const searchContent = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const [tasksRes, notesRes] = await Promise.all([
          fetch(`/api/tasks?search=${encodeURIComponent(query)}&limit=5`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/notes?search=${encodeURIComponent(query)}&limit=5`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const [tasksData, notesData] = await Promise.all([tasksRes.json(), notesRes.json()]);

        const results = [
          ...(tasksData.data?.items || []).map((item: any) => ({
            ...item,
            type: "task",
          })),
          ...(notesData.data?.items || []).map((item: any) => ({
            ...item,
            type: "note",
          })),
        ];

        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [token]
  );

  const handleSelect = (callback: () => void) => {
    setCommandPaletteOpen(false);
    callback();
  };

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder={t("common.search") + "..."} onValueChange={searchContent} />
      <CommandList>
        <CommandEmpty>{isSearching ? "Searching..." : "No results found."}</CommandEmpty>

        {searchResults.length > 0 && (
          <>
            <CommandGroup heading="Search Results">
              {searchResults.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() =>
                    handleSelect(() =>
                      router.push(
                        result.type === "task" ? `/tasks?id=${result.id}` : `/notes?id=${result.id}`
                      )
                    )
                  }
                >
                  {result.type === "task" ? (
                    <CheckSquare className="mr-2 h-4 w-4" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  <span>{result.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleSelect(() => router.push("/tasks?new=true"))}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => router.push("/notes?new=true"))}>
            <Plus className="mr-2 h-4 w-4" />
            New Note
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect(() => router.push("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => router.push("/tasks"))}>
            <CheckSquare className="mr-2 h-4 w-4" />
            Tasks
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => router.push("/notes"))}>
            <FileText className="mr-2 h-4 w-4" />
            Notes
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => router.push("/categories"))}>
            <Folder className="mr-2 h-4 w-4" />
            Categories
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => router.push("/tags"))}>
            <Tag className="mr-2 h-4 w-4" />
            Tags
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => handleSelect(() => router.push("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
