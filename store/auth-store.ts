import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserSafe } from "@/types";

interface AuthState {
  user: UserSafe | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserSafe, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<UserSafe>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updatedUser) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        }));
      },
    }),
    {
      name: "auth-storage",
    }
  )
);
