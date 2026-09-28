"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { Toaster } from "@/components/feedback/Toaster";
import { ThemeSync } from "@/components/layout/ThemeSync";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeSync />
      {children}
      <ConfirmDialog />
      <Toaster />
    </MotionConfig>
  );
}
