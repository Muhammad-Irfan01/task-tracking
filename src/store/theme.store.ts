import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { THEME_STORAGE_KEY } from "@/lib/constants";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  hydrated: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      hydrated: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme }) => ({ theme }),
      // Hydrated manually by <ThemeSync /> so server and first client render match.
      skipHydration: true,
    },
  ),
);
