"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { ProductivityChart } from "@/components/dashboard/ProductivityChart";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CheckCircle, Clock, AlertTriangle, FileText, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats, CalendarEvent, ActivityLogWithTask } from "@/types";

export default function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityLogWithTask[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activityRes, calendarRes] = await Promise.all([
        fetch("/api/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/dashboard/activity?limit=10", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/dashboard/calendar", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [statsData, activityData, calendarData] = await Promise.all([
        statsRes.json(),
        activityRes.json(),
        calendarRes.json(),
      ]);

      if (statsData.success) setStats(statsData.data);
      if (activityData.success) setActivities(activityData.data);
      if (calendarData.success) setCalendarEvents(calendarData.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {user?.name || "there"}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your tasks today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Tasks"
          value={stats?.totalTasks || 0}
          icon={CheckCircle}
          description={`${stats?.todayTasks || 0} due today`}
        />
        <SummaryCard
          title="In Progress"
          value={stats?.inProgressTasks || 0}
          icon={Clock}
          description="Currently working on"
        />
        <SummaryCard
          title="Completed"
          value={stats?.completedTasks || 0}
          icon={CheckCircle}
          description={`${stats?.completionRate || 0}% completion rate`}
          className="border-green-200 dark:border-green-900"
        />
        <SummaryCard
          title="Overdue"
          value={stats?.overdueTasks || 0}
          icon={AlertTriangle}
          description="Need attention"
          className="border-red-200 dark:border-red-900"
        />
      </div>

      {/* Productivity Score */}
      {stats && stats.productivityScore > 0 && (
        <div className="bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Productivity Score
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Based on your completed tasks and activity
              </p>
            </div>
            <div className="text-4xl font-bold text-primary">
              {stats.productivityScore}
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Productivity Chart */}
        <div className="lg:col-span-4">
          <ProductivityChart />
        </div>

        {/* Notes Summary */}
        <div className="lg:col-span-3">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </h3>
              <span className="text-2xl font-bold">{stats?.totalNotes || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total notes in your collection</p>
          </div>
        </div>
      </div>

      {/* Calendar and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CalendarView events={calendarEvents} />
        <RecentActivity activities={activities} />
      </div>
    </div>
  );
}
