"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useModuleAccessStore = create(
  persist(
    (set) => ({
      myAccess: null,
      setMyAccess: (myAccess) => set({ myAccess: myAccess ?? null }),
      clearMyAccess: () => set({ myAccess: null }),
    }),
    {
      name: "module-access-storage",
      partialize: (state) => ({
        myAccess: state.myAccess,
      }),
    }
  )
);
