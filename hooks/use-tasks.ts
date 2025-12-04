import useSWR from "swr";
import { useAuthStore } from "@/store/auth-store";
import { useTaskStore } from "@/store/task-store";
import type { TaskWithRelations, APIResponse } from "@/types";
import type { TaskQueryParams } from "@/types/api";

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export function useTasks(params?: TaskQueryParams) {
  const token = useAuthStore((state) => state.token);
  const setTasks = useTaskStore((state) => state.setTasks);
  const setLoading = useTaskStore((state) => state.setLoading);

  const queryString = params ? "?" + new URLSearchParams(params as any).toString() : "";

  const { data, error, mutate, isLoading } = useSWR<APIResponse<{ items: TaskWithRelations[] }>>(
    token ? [`/api/tasks${queryString}`, token] : null,
    ([url, token]: [string, string]) => fetcher(url, token),
    {
      onSuccess: (data) => {
        if (data.success && data.data) {
          setTasks(data.data.items);
        }
        setLoading(false);
      },
      onError: () => {
        setLoading(false);
      },
    }
  );

  return {
    tasks: data?.data?.items || [],
    meta: data?.meta,
    isLoading,
    error,
    mutate,
  };
}

export function useTask(id: string) {
  const token = useAuthStore((state) => state.token);

  const { data, error, mutate, isLoading } = useSWR<APIResponse<TaskWithRelations>>(
    token && id ? [`/api/tasks/${id}`, token] : null,
    ([url, token]: [string, string]) => fetcher(url, token)
  );

  return {
    task: data?.data,
    isLoading,
    error,
    mutate,
  };
}
