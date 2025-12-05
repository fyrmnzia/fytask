"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Calendar,
  Tag,
  Folder,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    key: "dashboard.title",
  },
  {
    name: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    key: "tasks.title",
  },
  {
    name: "Notes",
    href: "/notes",
    icon: FileText,
    key: "notes.title",
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: Calendar,
    key: "dashboard.calendar",
  },
];

export function Sidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 border-r bg-background transition-transform duration-300 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Mobile header */}
          <div className="flex h-16 items-center justify-between border-b px-4 md:hidden">
            <span className="font-bold text-lg">Menu</span>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      isActive && "bg-secondary font-medium"
                    )}
                    onClick={() => {
                      router.push(item.href);
                      if (window.innerWidth < 768) {
                        setSidebarOpen(false);
                      }
                    }}
                  >
                    <Icon className="h-5 w-5" />
                    {t(item.key)}
                  </Button>
                );
              })}
            </nav>

            <Separator className="my-4" />

            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Organize
              </h3>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => router.push("/categories")}
              >
                <Folder className="h-5 w-5" />
                Categories
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => router.push("/tags")}
              >
                <Tag className="h-5 w-5" />
                Tags
              </Button>
            </div>

            <Separator className="my-4" />

            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-5 w-5" />
              {t("settings.title")}
            </Button>
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}
