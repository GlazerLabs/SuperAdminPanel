"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      loggedIn: false,
      hasHydrated: false,
      setAuth: ({ token, user }) =>
        set({
          token: token ?? null,
          user: user ?? null,
          loggedIn: !!token,
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          loggedIn: false,
        }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        loggedIn: state.loggedIn,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated?.(true);
      },
    }
  )
);

