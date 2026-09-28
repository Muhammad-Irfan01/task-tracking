"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

interface TabsProps<T extends string> {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
}

export function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  const indicatorId = useId();
  return (
    <div
      role="tablist"
      className="scrollbar-none flex items-center gap-1 overflow-x-auto border-b border-ink-900/[0.06] dark:border-paper-100/[0.06]"
    >
      {tabs.map((tab) => {
        const selected = tab === active;
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab)}
            className={cn(
              "relative -mb-px whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors",
              selected
                ? "text-brand-600 dark:text-brand-300"
                : "text-ink-900/50 hover:text-ink-900 dark:text-paper-100/50 dark:hover:text-paper-100",
            )}
          >
            {tab}
            {selected && (
              <motion.span
                layoutId={indicatorId}
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-500"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
