"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui";
import { authService, errorMessage } from "@/services";
import { toast } from "@/store";
import type { PlatformUser } from "@/types";

/** Chrome for the super-admin console: no desk sidebar, just the platform header. */
export function PlatformShell({ user, children }: { user: PlatformUser; children: ReactNode }) {
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await authService.logout();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login?signedOut=1");
    } catch (error) {
      toast.error(errorMessage(error));
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-900/[0.06] bg-white/80 backdrop-blur dark:border-paper-100/[0.06] dark:bg-ink-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/platform" aria-label="Platform home">
            <Logo />
          </Link>
          <span className="hidden items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-600 sm:inline-flex dark:text-brand-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Platform console
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-ink-900/60 md:inline dark:text-paper-100/60">{user.email}</span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} loading={signingOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
