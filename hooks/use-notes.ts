import useSWR from "swr";
import { useAuthStore } from "@/store/auth-store";
import type { NoteWithRelations, APIResponse } from "@/types";
import type { NoteQueryParams } from "@/types/api";

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export function useNotes(params?: NoteQueryParams) {
  const token = useAuthStore((state) => state.token);

  const queryString = params ? "?" + new URLSearchParams(params as any).toString() : "";

  const { data, error, mutate, isLoading } = useSWR<APIResponse<{ items: NoteWithRelations[] }>>(
    token ? [`/api/notes${queryString}`, token] : null,
    ([url, token]: [string, string]) => fetcher(url, token)
  );

  return {
    notes: data?.data?.items || [],
    meta: data?.meta,
    isLoading,
    error,
    mutate,
  };
}

export function useNote(id: string) {
  const token = useAuthStore((state) => state.token);

  const { data, error, mutate, isLoading } = useSWR<APIResponse<NoteWithRelations>>(
    token && id ? [`/api/notes/${id}`, token] : null,
    ([url, token]: [string, string]) => fetcher(url, token)
  );

  return {
    note: data?.data,
    isLoading,
    error,
    mutate,
  };
}
