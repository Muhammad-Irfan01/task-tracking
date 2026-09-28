"use client";

import { CircleCheck, CircleX, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useToastStore, type ToastType } from "@/store";

const ICONS: Record<ToastType, ReactNode> = {
  success: <CircleCheck className="h-5 w-5 shrink-0 text-emerald-500" />,
  error: <CircleX className="h-5 w-5 shrink-0 text-rose-500" />,
  info: <Info className="h-5 w-5 shrink-0 text-brand-500" />,
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            role={t.type === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            className="surface flex items-start gap-3 rounded-xl px-4 py-3 shadow-card"
          >
            {ICONS[t.type]}
            <p className="flex-1 text-sm text-ink-800 dark:text-paper-100">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-ink-900/40 hover:text-ink-900 dark:text-paper-100/40 dark:hover:text-paper-100"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
