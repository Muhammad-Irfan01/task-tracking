"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useUiStore } from "@/store";
import { SidebarContent } from "./SidebarContent";

export function Sidebar() {
  const open = useUiStore((state) => state.mobileNavOpen);
  const close = useUiStore((state) => state.closeMobileNav);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <aside className="surface fixed inset-y-0 left-0 hidden w-64 border-y-0 border-l-0 lg:block">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="absolute inset-0 bg-ink-950/50"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="surface absolute inset-y-0 left-0 w-72 shadow-card"
            >
              <button
                onClick={close}
                aria-label="Close navigation menu"
                className="absolute right-4 top-5 rounded-lg p-1.5 hover:bg-ink-900/5 dark:hover:bg-paper-100/10"
              >
                <X className="h-4.5 w-4.5" />
              </button>
              <SidebarContent onNavigate={close} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
