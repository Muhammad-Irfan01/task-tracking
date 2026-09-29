"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useCurrentUser } from "@/components/providers/SessionProvider";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { authService, errorMessage } from "@/services";
import { toast } from "@/store";

const ITEM =
  "block w-full px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-900/[0.03] dark:text-paper-100/75 dark:hover:bg-paper-100/[0.05]";

export function UserMenu() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const close = () => setOpen(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await authService.logout();
      // Full navigation (not router.push) so every in-memory store is wiped with the session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login?signedOut=1");
    } catch (error) {
      toast.error(errorMessage(error));
      setSigningOut(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-lg py-1 pl-1.5 pr-2 hover:bg-ink-900/5 dark:hover:bg-paper-100/10"
      >
        <Avatar name={user.name} color={user.avatarColor} size="sm" />
        <ChevronDown
          className={cn("hidden h-3.5 w-3.5 text-ink-900/40 transition-transform sm:block dark:text-paper-100/40", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={close} />
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="surface absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-xl py-1.5 shadow-card"
            >
              <div className="border-b border-ink-900/[0.06] px-3 py-2 dark:border-paper-100/[0.06]">
                <p className="truncate text-sm font-medium text-ink-900 dark:text-paper-100">{user.name}</p>
                <p className="truncate text-xs text-ink-900/45 dark:text-paper-100/45">
                  {user.kind === "employee" ? `${user.dept} · ${user.tenantName}` : `${user.role} · ${user.dept}`}
                </p>
              </div>
              {user.kind === "employee" ? (
                <>
                  <Link href="/portal" role="menuitem" onClick={close} className={ITEM}>
                    My tickets
                  </Link>
                  <Link href="/portal/account" role="menuitem" onClick={close} className={ITEM}>
                    My account
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/settings?tab=General" role="menuitem" onClick={close} className={ITEM}>
                    My Profile
                  </Link>
                  <Link href="/settings?tab=Notifications" role="menuitem" onClick={close} className={ITEM}>
                    Preferences
                  </Link>
                  <Link href={`/tickets?assignee=${encodeURIComponent(user.name)}`} role="menuitem" onClick={close} className={ITEM}>
                    My tickets
                  </Link>
                </>
              )}
              <button
                role="menuitem"
                onClick={signOut}
                disabled={signingOut}
                className="w-full px-3 py-2 text-left text-sm text-rose-500 hover:bg-rose-500/5 disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
