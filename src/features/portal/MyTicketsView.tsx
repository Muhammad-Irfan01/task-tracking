"use client";

import { ChevronRight, Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { useCurrentUser } from "@/components/providers/SessionProvider";
import { Badge, Card, EmptyState, ErrorState, LinkButton, PageHeader, PriorityDot, RowSkeleton, SearchInput, Tabs } from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { isClosedStatus } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { errorMessage, portalService } from "@/services";
import type { Ticket } from "@/types";

const FILTERS = ["Open", "Resolved", "All"] as const;
type Filter = (typeof FILTERS)[number];

export function MyTicketsView() {
  const user = useCurrentUser();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("Open");
  const [search, setSearch] = useState("");
  const query = useDebounce(search, 200).toLowerCase();

  useEffect(() => {
    portalService
      .tickets()
      .then(setTickets)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const counts = useMemo(() => {
    const open = (tickets ?? []).filter((t) => !isClosedStatus(t.status)).length;
    return { Open: open, Resolved: (tickets ?? []).length - open, All: (tickets ?? []).length };
  }, [tickets]);

  const visible = useMemo(
    () =>
      (tickets ?? [])
        .filter((t) => filter === "All" || (filter === "Open" ? !isClosedStatus(t.status) : isClosedStatus(t.status)))
        .filter((t) => !query || t.subject.toLowerCase().includes(query) || t.number.toLowerCase().includes(query) || t.department.toLowerCase().includes(query)),
    [tickets, filter, query],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hi ${user.firstName}, here are your tickets`}
        description="Send a request to any department and follow it here until it's done."
        actions={
          <LinkButton href="/portal/new">
            <Plus className="h-4 w-4" /> New ticket
          </LinkButton>
        }
      />

      <Card className="p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by subject, ticket number or department…" />
      </Card>

      <Card>
        <div className="px-4">
          <Tabs tabs={FILTERS} active={filter} onChange={setFilter} />
        </div>
        <p className="px-5 pt-3 text-xs text-ink-900/45 dark:text-paper-100/45">
          {tickets ? `${counts.Open} open · ${counts.Resolved} resolved` : "Loading…"}
        </p>

        {error && <ErrorState message={error} onRetry={() => location.reload()} />}
        {!error && !tickets && (
          <div className="px-4">
            {[0, 1, 2].map((i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )}
        {tickets && tickets.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="No tickets yet"
            description="Need something from IT, HR, facilities or any other team? Create a ticket and they'll pick it up."
            action={
              <LinkButton href="/portal/new">
                <Plus className="h-4 w-4" /> Create your first ticket
              </LinkButton>
            }
          />
        )}
        {tickets && tickets.length > 0 && visible.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-ink-900/50 dark:text-paper-100/50">No tickets match.</p>
        )}

        <ul className="divide-y divide-ink-900/[0.05] dark:divide-paper-100/[0.05]">
          {visible.map((t, i) => (
            <li key={t.id}>
              <FadeIn index={Math.min(i, 10)} step={0.03}>
              <Link
                href={`/portal/tickets/${t.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-900/[0.02] dark:hover:bg-paper-100/[0.03]"
              >
                <PriorityDot priority={t.priority} pulse={t.priority === "Emergency" && !isClosedStatus(t.status)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900 dark:text-paper-100">{t.subject}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-900/50 dark:text-paper-100/50">
                    <span className="font-mono">{t.number}</span> · {t.department} · {t.topic} · updated {timeAgo(t.updated)}
                  </p>
                </div>
                <div className="hidden text-right text-xs text-ink-900/50 sm:block dark:text-paper-100/50">
                  {t.assignee === "Unassigned" ? "Waiting for an agent" : `With ${t.assignee}`}
                </div>
                <Badge status={t.status} />
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-900/30 dark:text-paper-100/30" />
              </Link>
              </FadeIn>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
