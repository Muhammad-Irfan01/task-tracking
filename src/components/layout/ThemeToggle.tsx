"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useThemeStore } from "@/store";

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggle = useThemeStore((state) => state.toggleTheme);
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="rounded-lg p-2 text-ink-700 hover:bg-ink-900/5 dark:text-paper-100/70 dark:hover:bg-paper-100/10"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          className="block"
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Icon className="h-4.5 w-4.5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
