"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ProductivityChartProps {
  data?: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
}

export function ProductivityChart({ data = [] }: ProductivityChartProps) {
  const chartData = useMemo(() => {
    // Generate sample data if none provided
    if (data.length === 0) {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return days.map((day) => ({
        name: day,
        completed: Math.floor(Math.random() * 20) + 5,
        created: Math.floor(Math.random() * 15) + 3,
      }));
    }

    return data.map((item) => ({
      name: new Date(item.date).toLocaleDateString("en", { weekday: "short" }),
      completed: item.completed,
      created: item.created,
    }));
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Productivity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" tick={{ fill: "currentColor" }} />
            <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Completed"
            />
            <Line
              type="monotone"
              dataKey="created"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              name="Created"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
