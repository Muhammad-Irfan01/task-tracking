"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { useActivityStore } from "@/store/activity.store";

/** Wait before showing so instant requests don't flash the bar. */
const SHOW_DELAY_MS = 150;
/** Give up on a navigation that never changed the URL (redirect back, cancelled). */
const NAVIGATION_TIMEOUT_MS = 10_000;

/** Slim bar across the top of the viewport while API calls or page navigations are in flight. */
export function TopProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const current = search ? `${pathname}?${search}` : pathname;

  const requests = useActivityStore((state) => state.requests);
  // The URL a link click navigated away from; navigation is pending until the URL changes.
  const [leaving, setLeaving] = useState<string | null>(null);
  const navigating = leaving === current;
  const busy = requests > 0 || navigating;

  const onLinkClick = useEffectEvent((event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element | null)?.closest?.("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    // Same page (or just a hash change): nothing to load.
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;
    setLeaving(current);
  });

  useEffect(() => {
    const listener = (event: MouseEvent) => onLinkClick(event);
    // Capture phase: Next's <Link> calls preventDefault before a bubbling listener would see the click.
    document.addEventListener("click", listener, true);
    return () => document.removeEventListener("click", listener, true);
  }, []);

  useEffect(() => {
    if (!navigating) return;
    const timer = setTimeout(() => setLeaving(null), NAVIGATION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [navigating]);

  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setArmed(true), SHOW_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setArmed(false);
    };
  }, [busy]);

  const visible = busy && armed;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="bar"
            className="h-full origin-left bg-linear-to-r from-brand-400 to-brand-600 shadow-[0_0_8px_var(--color-brand-500)]"
            initial={{ scaleX: 0, opacity: 1 }}
            // Ease toward ~90% and hold there; completion is the exit animation.
            animate={{ scaleX: 0.9, transition: { duration: 8, ease: [0.08, 0.8, 0.2, 1] } }}
            exit={{ scaleX: 1, opacity: 0, transition: { scaleX: { duration: 0.2 }, opacity: { duration: 0.25, delay: 0.15 } } }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
