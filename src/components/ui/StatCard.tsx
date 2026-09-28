"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const ACCENTS = {
  brand: "bg-brand-500/10 text-brand-500",
  amber: "bg-amber-500/10 text-amber-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  rose: "bg-rose-500/10 text-rose-500",
};

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  /** Colour: whether the change is good (green) or bad (red). */
  deltaPositive?: boolean;
  /** Arrow: which way the number moved. Defaults to following `deltaPositive`. */
  trend?: "up" | "down" | "flat";
  icon?: LucideIcon;
  accent?: keyof typeof ACCENTS;
}

const ARROWS = { up: "↑", down: "↓", flat: "→" };

export function StatCard({ label, value, delta, deltaPositive = true, trend, icon: Icon, accent = "brand" }: StatCardProps) {
  const arrow = ARROWS[trend ?? (deltaPositive ? "up" : "down")];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface rounded-2xl p-5 shadow-soft"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-900/50 dark:text-paper-100/50">{label}</p>
        {Icon && (
          <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl", ACCENTS[accent])}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-ink-900 dark:text-paper-100">{value}</p>
      {delta && (
        <p className={cn("mt-1.5 text-xs font-medium", deltaPositive ? "text-emerald-500" : "text-rose-500")}>
          {arrow} {delta}
        </p>
      )}
    </motion.div>
  );
}
