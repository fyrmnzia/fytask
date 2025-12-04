import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useTaskStore } from "@/store/task-store";

export function useRealtime() {
  const user = useAuthStore((state) => state.user);
  const addTask = useTaskStore((state) => state.addTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);

  useEffect(() => {
    if (!user) return;

    // Create EventSource for Server-Sent Events
    const eventSource = new EventSource(`/api/realtime?userId=${user.id}`);

    eventSource.addEventListener("task.created", (event) => {
      const data = JSON.parse(event.data);
      addTask(data);
    });

    eventSource.addEventListener("task.updated", (event) => {
      const data = JSON.parse(event.data);
      updateTask(data.id, data);
    });

    eventSource.addEventListener("task.deleted", (event) => {
      const data = JSON.parse(event.data);
      deleteTask(data.id);
    });

    eventSource.onerror = () => {
      console.error("Realtime connection error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [user, addTask, updateTask, deleteTask]);
}
