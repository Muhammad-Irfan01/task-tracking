"use client";

import { Menu } from "lucide-react";
import { useUiStore } from "@/store";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsMenu } from "./NotificationsMenu";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export function Header() {
  const openNav = useUiStore((state) => state.openMobileNav);

  return (
    <header className="sticky top-0 z-30 border-b border-ink-900/[0.06] bg-white/80 backdrop-blur dark:border-paper-100/[0.06] dark:bg-ink-900/80">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          onClick={openNav}
          aria-label="Open navigation menu"
          className="-ml-2 rounded-lg p-2 hover:bg-ink-900/5 lg:hidden dark:hover:bg-paper-100/10"
        >
          <Menu className="h-5 w-5" />
        </button>
        <GlobalSearch />
        <div className="flex-1 sm:hidden" />
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <NotificationsMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
