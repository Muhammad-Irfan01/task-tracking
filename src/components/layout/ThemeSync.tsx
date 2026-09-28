"use client";

import { useEffect } from "react";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import { useThemeStore } from "@/store";

/**
 * Inline script run before paint so the stored/system theme applies without a flash.
 * Must stay in sync with the persist format of `useThemeStore`.
 */
export const themeInitScript = `(function(){try{var s=JSON.parse(localStorage.getItem('${THEME_STORAGE_KEY}')||'null');var t=s&&s.state&&s.state.theme;if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})();`;

/** Hydrates the persisted theme store and mirrors it onto <html class="dark">. */
export function ThemeSync() {
  const theme = useThemeStore((state) => state.theme);
  const hydrated = useThemeStore((state) => state.hydrated);

  useEffect(() => {
    void Promise.resolve(useThemeStore.persist.rehydrate()).then(() => {
      // First visit: adopt whatever the init script picked from the OS preference.
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        const prefersDark = document.documentElement.classList.contains("dark");
        useThemeStore.setState({ theme: prefersDark ? "dark" : "light" });
      }
      useThemeStore.setState({ hydrated: true });
    });
  }, []);

  useEffect(() => {
    if (hydrated) document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme, hydrated]);

  return null;
}
