"use client";

import { Bell, CheckCheck, Clock, MessageSquare, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { useNotificationsStore } from "@/store";
import type { NotificationType } from "@/types";

const POLL_MS = 30_000;

const ICONS: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  assigned: { icon: UserPlus, className: "bg-brand-500/10 text-brand-500" },
  reply: { icon: MessageSquare, className: "bg-emerald-500/10 text-emerald-500" },
  sla: { icon: Clock, className: "bg-rose-500/10 text-rose-500" },
};

export function NotificationsMenu() {
  const { items, unread, loaded, fetch, markRead } = useNotificationsStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void fetch();
    const timer = setInterval(() => void fetch(), POLL_MS);
    return () => clearInterval(timer);
  }, [fetch]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-ink-700 hover:bg-ink-900/5 dark:text-paper-100/70 dark:hover:bg-paper-100/10"
      >
        <Bell className="h-4.5 w-4.5" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="surface absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] origin-top-right rounded-xl shadow-card"
            >
              <div className="flex items-center justify-between border-b border-ink-900/[0.06] px-4 py-3 dark:border-paper-100/[0.06]">
                <p className="text-sm font-semibold text-ink-900 dark:text-paper-100">Notifications</p>
                <button
                  onClick={() => void markRead()}
                  disabled={unread === 0}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-40"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto py-1">
                {!loaded && <p className="px-4 py-6 text-center text-sm text-ink-900/50 dark:text-paper-100/50">Loading…</p>}
                {loaded && items.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-ink-900/50 dark:text-paper-100/50">You’re all caught up.</p>
                )}
                {items.map((n) => {
                  const { icon: Icon, className } = ICONS[n.type];
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => {
                        setOpen(false);
                        if (!n.read) void markRead([n.id]);
                      }}
                      className="flex gap-3 px-4 py-2.5 hover:bg-ink-900/[0.03] dark:hover:bg-paper-100/[0.05]"
                    >
                      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", className)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-sm", n.read ? "text-ink-900/60 dark:text-paper-100/60" : "font-medium text-ink-900 dark:text-paper-100")}>
                          {n.title}
                        </span>
                        <span className="block truncate text-xs text-ink-900/45 dark:text-paper-100/45">{n.body}</span>
                        <span className="block text-[11px] text-ink-900/35 dark:text-paper-100/35">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
