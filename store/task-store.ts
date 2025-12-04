import { create } from "zustand";
import type { TaskWithRelations } from "@/types";

interface TaskState {
  tasks: TaskWithRelations[];
  selectedTask: TaskWithRelations | null;
  isLoading: boolean;
  setTasks: (tasks: TaskWithRelations[]) => void;
  addTask: (task: TaskWithRelations) => void;
  updateTask: (id: string, task: Partial<TaskWithRelations>) => void;
  deleteTask: (id: string) => void;
  setSelectedTask: (task: TaskWithRelations | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  selectedTask: null,
  isLoading: false,

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),

  updateTask: (id, updatedTask) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...updatedTask } : task)),
      selectedTask:
        state.selectedTask?.id === id
          ? { ...state.selectedTask, ...updatedTask }
          : state.selectedTask,
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
    })),

  setSelectedTask: (task) => set({ selectedTask: task }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
