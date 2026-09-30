"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { NotificationsMenu } from "@/components/layout/NotificationsMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useCurrentUser } from "@/components/providers/SessionProvider";
import { LinkButton } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal", label: "My tickets" },
  { href: "/portal/help", label: "Help center" },
  { href: "/portal/account", label: "Account" },
];

/** Chrome for the employee request portal: a simple top bar, no desk sidebar. */
export function PortalShell({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const pathname = usePathname();
  const active = (href: string) => (href === "/portal" ? pathname === "/portal" || pathname.startsWith("/portal/tickets") : pathname.startsWith(href));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-900/[0.06] bg-white/80 backdrop-blur dark:border-paper-100/[0.06] dark:bg-ink-900/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/portal" aria-label="Request portal home" className="flex items-center gap-2">
            <Logo src={user.tenantLogoUrl} name={user.tenantName} />
          </Link>
          <span className="hidden truncate text-sm text-ink-900/45 md:inline dark:text-paper-100/45">{user.tenantName} · Requests</span>
          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium",
                  active(item.href)
                    ? "bg-brand-500/10 text-brand-600 dark:text-brand-300"
                    : "text-ink-900/60 hover:bg-ink-900/[0.04] dark:text-paper-100/60 dark:hover:bg-paper-100/[0.06]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <LinkButton href="/portal/new" size="sm" className="hidden sm:inline-flex">
              <Plus className="h-4 w-4" /> New ticket
            </LinkButton>
            <ThemeToggle />
            <NotificationsMenu />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
      <LinkButton
        href="/portal/new"
        aria-label="New ticket"
        className="fixed bottom-5 right-5 z-30 rounded-full shadow-card sm:hidden"
        size="lg"
      >
        <Plus className="h-5 w-5" />
      </LinkButton>
    </div>
  );
}
