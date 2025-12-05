"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeTime } from "@/lib/utils";
import { CheckCircle2, FileText, Trash2, Edit } from "lucide-react";
import type { ActivityLog } from "@/types";
import type { Prisma } from "@/app/generated/prisma/client";

export type ActivityLogWithTask = Prisma.ActivityLogGetPayload<{
  include: {
    task: {
      select: {
        title: true;
      };
    };
  };
}>;

interface RecentActivityProps {
  activities?: ActivityLogWithTask[];
}

export function RecentActivity({ activities = [] }: RecentActivityProps) {
  const getIcon = (action: string) => {
    switch (action) {
      case "CREATED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "UPDATED":
        return <Edit className="h-4 w-4 text-blue-600" />;
      case "DELETED":
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionText = (activity: ActivityLog) => {
    const action = activity.action.toLowerCase();
    return `${action} ${activity.entityType.toLowerCase()}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1">{getIcon(activity.action)}</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">You</span> {getActionText(activity)}
                      {activity.task && (
                        <span className="font-medium"> "{activity.task.title}"</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(activity.createdAt))}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
