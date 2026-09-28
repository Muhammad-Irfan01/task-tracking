"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, NAV_SECTIONS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useReport } from "@/hooks/useReport";
import { Logo } from "./Logo";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: report } = useReport(7);
  const overdue = report?.overdueTickets ?? 0;
  const dueSoon = report?.atRiskTickets ?? 0;

  return (
    <div className="flex h-full flex-col gap-6 py-6">
      <Logo />
      <nav className="flex-1 space-y-6 overflow-y-auto px-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-900/35 dark:text-paper-100/30">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isNavActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "text-brand-600 dark:text-brand-300"
                        : "text-ink-900/60 hover:bg-ink-900/[0.03] hover:text-ink-900 dark:text-paper-100/55 dark:hover:bg-paper-100/[0.05] dark:hover:text-paper-100",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="active-nav-pill"
                        className="absolute inset-0 rounded-lg bg-brand-500/10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <item.icon className="relative h-4.5 w-4.5 shrink-0" />
                    <span className="relative">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {overdue + dueSoon > 0 && (
        <div className="px-4">
          <Link
            href="/tickets?overdue=1"
            onClick={onNavigate}
            className="block rounded-xl bg-linear-to-br from-brand-500 to-brand-700 p-4 text-white transition-transform hover:scale-[1.01]"
          >
            <p className="text-sm font-semibold">SLA at risk</p>
            <p className="mt-1 text-xs leading-relaxed text-white/75">
              {overdue} breached{dueSoon > 0 && `, ${dueSoon} due within 12h`}. Review the queue.
            </p>
          </Link>
        </div>
      )}
    </div>
  );
}
