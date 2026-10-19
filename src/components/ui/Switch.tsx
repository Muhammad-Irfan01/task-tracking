"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  /** Disables the switch and spins its knob while a save is in flight. */
  loading?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, description, disabled, loading = false, className }: SwitchProps) {
  const id = useId();
  const control = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : "Toggle"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50",
        checked ? "bg-brand-500" : "bg-ink-900/15 dark:bg-paper-100/15",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
        className={cn("flex h-4 w-4 items-center justify-center rounded-full bg-white text-brand-500 shadow-soft", checked && "ml-auto")}
      >
        {loading && <Spinner className="h-2.5 w-2.5 border-[1.5px]" />}
      </motion.span>
    </button>
  );
  if (!label) return control;
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-medium text-ink-900 dark:text-paper-100">{label}</span>
        {description && <span className="block text-xs text-ink-900/50 dark:text-paper-100/50">{description}</span>}
      </label>
      {control}
    </div>
  );
}
