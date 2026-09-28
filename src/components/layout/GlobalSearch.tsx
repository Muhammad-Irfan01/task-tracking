"use client";

import { BookOpen, Search, Ticket, UserCog, Users, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { searchService } from "@/services";
import { useTicketsStore } from "@/store";
import type { SearchResults } from "@/types";

interface ResultItem {
  key: string;
  href: string;
  label: string;
  detail: string;
  group: string;
  icon: LucideIcon;
}

function flatten(results: SearchResults): ResultItem[] {
  return [
    ...results.tickets.map((t) => ({ key: `t${t.id}`, href: `/tickets/${t.id}`, label: t.subject, detail: `${t.number} · ${t.status}`, group: "Tickets", icon: Ticket })),
    ...results.customers.map((c) => ({ key: `c${c.id}`, href: `/customers/${c.id}`, label: c.name, detail: c.email, group: "Customers", icon: Users })),
    ...results.agents.map((a) => ({ key: `a${a.id}`, href: `/staff?q=${encodeURIComponent(a.name)}`, label: a.name, detail: a.dept, group: "Agents", icon: UserCog })),
    ...results.articles.map((a) => ({ key: `k${a.id}`, href: `/knowledge-base/${a.id}`, label: a.question, detail: a.category, group: "Articles", icon: BookOpen })),
  ];
}

export function GlobalSearch() {
  const router = useRouter();
  const setFilters = useTicketsStore((state) => state.setFilters);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<{ q: string; items: ResultItem[] } | null>(null);
  const [active, setActive] = useState(-1);
  const debounced = useDebounce(query.trim(), 200);

  useEffect(() => {
    if (debounced.length < 2) return;
    const controller = new AbortController();
    searchService
      .search(debounced, controller.signal)
      .then((data) => {
        setResults({ q: debounced, items: flatten(data) });
        setActive(-1);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [debounced]);

  const items = useMemo(() => (results && results.q === debounced ? results.items : []), [results, debounced]);
  const loading = debounced.length >= 2 && results?.q !== debounced;
  const open = focused && query.trim().length >= 2;

  function go(href: string) {
    setFocused(false);
    setQuery("");
    router.push(href);
  }

  function searchTickets() {
    setFilters({ query: query.trim() });
    go("/tickets");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (active >= 0 && items[active]) go(items[active].href);
      else if (query.trim()) searchTickets();
    } else if (event.key === "Escape") {
      (event.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className="relative hidden max-w-md flex-1 sm:block">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-900/35 dark:text-paper-100/35" />
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="global-search-results"
        aria-label="Global search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={onKeyDown}
        placeholder="Search tickets, customers, agents…"
        className="w-full rounded-lg bg-ink-900/[0.03] py-2 pl-9 pr-3 text-sm placeholder:text-ink-900/35 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 dark:bg-paper-100/[0.06] dark:placeholder:text-paper-100/30"
      />

      <AnimatePresence>
        {open && (
          <motion.div
            id="global-search-results"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="surface absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl py-2 shadow-card"
          >
            {loading && <p className="px-4 py-3 text-sm text-ink-900/50 dark:text-paper-100/50">Searching…</p>}
            {!loading && items.length === 0 && (
              <p className="px-4 py-3 text-sm text-ink-900/50 dark:text-paper-100/50">No matches for “{debounced}”.</p>
            )}
            {items.map((item, i) => {
              const header = i === 0 || items[i - 1].group !== item.group ? item.group : null;
              return (
                <div key={item.key}>
                  {header && (
                    <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-900/35 dark:text-paper-100/35">
                      {header}
                    </p>
                  )}
                  <button
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => go(item.href)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left",
                      i === active && "bg-ink-900/[0.04] dark:bg-paper-100/[0.06]",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-brand-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink-900 dark:text-paper-100">{item.label}</span>
                      <span className="block truncate text-xs text-ink-900/45 dark:text-paper-100/45">{item.detail}</span>
                    </span>
                  </button>
                </div>
              );
            })}
            <button
              onMouseDown={(event) => event.preventDefault()}
              onClick={searchTickets}
              className="mt-1 w-full border-t border-ink-900/[0.06] px-4 pt-2.5 text-left text-xs font-medium text-brand-500 hover:text-brand-600 dark:border-paper-100/[0.06]"
            >
              Filter tickets by “{query.trim()}” ↵
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
