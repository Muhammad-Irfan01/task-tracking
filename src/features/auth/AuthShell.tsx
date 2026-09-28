"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui";

interface AuthShellProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered card layout shared by sign-in, sign-up and password recovery. */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6">
          <h1 className="font-display text-xl font-semibold text-ink-900 dark:text-paper-100">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-900/50 dark:text-paper-100/50">{description}</p>}
          <div className="mt-5">{children}</div>
        </Card>
        {footer && <div className="mt-4 text-center text-sm text-ink-900/55 dark:text-paper-100/55">{footer}</div>}
      </motion.div>
    </main>
  );
}

export const AUTH_LINK = "font-medium text-brand-500 hover:text-brand-600";
