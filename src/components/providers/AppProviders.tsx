"use client";

import { MotionConfig } from "motion/react";
import { Suspense, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { Toaster } from "@/components/feedback/Toaster";
import { TopProgress } from "@/components/feedback/TopProgress";
import { ThemeSync } from "@/components/layout/ThemeSync";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeSync />
      {/* Reads search params, so it can't block static rendering of the page. */}
      <Suspense fallback={null}>
        <TopProgress />
      </Suspense>
      {children}
      <ConfirmDialog />
      <Toaster />
    </MotionConfig>
  );
}
