"use client";

import { FileQuestionMark } from "lucide-react";
import { useEffect } from "react";
import {
  Avatar,
  BackLink,
  Badge,
  Breadcrumb,
  Card,
  EmptyState,
  LinkButton,
  RowSkeleton,
  Skeleton,
} from "@/components/ui";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { isClosedStatus } from "@/lib/constants";
import { useIsClient } from "@/hooks/useIsClient";
import { useCustomersStore, useTicketsStore } from "@/store";
import { useCollection } from "@/hooks/useCollection";
import type { Ticket } from "@/types";
import Link from "next/link";
import { TicketConversation } from "./TicketConversation";
import { TicketProperties } from "./TicketProperties";

export function TicketDetailView({ id }: { id: string }) {
  const ticket = useTicketsStore((state) => state.items.find((t) => String(t.id) === id));
  const detail = useTicketsStore((state) => state.details[id]);
  const fetchTicket = useTicketsStore((state) => state.fetchTicket);
  const isClient = useIsClient();

  useEffect(() => {
    void fetchTicket(id);
  }, [id, fetchTicket]);

  if (detail?.status === "error") {
    return (
      <Card className="p-6">
        <EmptyState
          icon={FileQuestionMark}
          title="Ticket not found"
          description={`We couldn't find a ticket with ID ${id}.`}
          action={
            <LinkButton href="/tickets" variant="secondary">
              Back to tickets
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const ready = ticket && detail?.status === "success";

  return (
    <div className="space-y-5">
      <div>
        <BackLink href="/tickets" label="Back to tickets" className="mb-2" />
        <Breadcrumb items={[{ label: "Tickets", href: "/tickets" }, { label: ticket?.number ?? "…" }]} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            {ticket ? (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-xl font-semibold text-ink-900 dark:text-paper-100">{ticket.subject}</h1>
                  <p className="mt-1 font-mono text-sm text-ink-900/45 dark:text-paper-100/45">
                    {ticket.number} · Opened {formatDateTime(ticket.created)}
                  </p>
                </div>
                <Badge status={ticket.status} />
              </div>
            ) : null}
            {ticket && isClient && (
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-900/[0.06] pt-3 text-xs dark:border-paper-100/[0.06]">
                {isClosedStatus(ticket.status) ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Resolved {relativeTime(ticket.resolvedAt)}</span>
                ) : (
                  <span className={cn("font-medium", ticket.isOverdue ? "text-rose-500" : "text-ink-900/60 dark:text-paper-100/60")}>
                    {ticket.isOverdue ? "SLA breached " : "Response due "}
                    {relativeTime(ticket.dueAt)}
                  </span>
                )}
                <span className="text-ink-900/50 dark:text-paper-100/50">
                  First response: {ticket.firstResponseAt ? relativeTime(ticket.firstResponseAt) : "awaiting agent"}
                </span>
                {ticket.rating && (
                  <span className="text-ink-900/50 dark:text-paper-100/50">Customer rating: {"★".repeat(ticket.rating)}</span>
                )}
              </div>
            )}
            {!ticket && (
              <div className="space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            )}
          </Card>

          {ready ? (
            <TicketConversation ticket={ticket} messages={detail.messages} />
          ) : (
            <Card className="p-5">
              {Array.from({ length: 3 }, (_, i) => (
                <RowSkeleton key={i} />
              ))}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {ticket ? (
            <>
              <TicketProperties key={ticket.id} ticket={ticket} />
              <Card className="space-y-3 p-5">
                <h2 className="mb-1 font-display font-semibold text-ink-900 dark:text-paper-100">Requester</h2>
                <div className="flex items-center gap-3">
                  <Avatar name={ticket.customer} />
                  <div className="min-w-0">
                    <CustomerLink ticket={ticket} />
                    <p className="text-xs text-ink-900/45 dark:text-paper-100/45">{ticket.customerEmail}</p>
                  </div>
                </div>
                <dl className="space-y-2 pt-2 text-sm">
                  {[
                    ["Organization", ticket.organization],
                    ["Department", ticket.department],
                    ["Help topic", ticket.topic],
                    ["Source", ticket.source],
                    ["Assigned to", ticket.assignee],
                  ].map(([term, value]) => (
                    <div key={term} className="flex justify-between gap-3">
                      <dt className="text-ink-900/50 dark:text-paper-100/50">{term}</dt>
                      <dd className="text-right font-medium text-ink-900 dark:text-paper-100">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </>
          ) : (
            <Card className="space-y-3 p-5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerLink({ ticket }: { ticket: Ticket }) {
  const customers = useCollection(useCustomersStore);
  const customer = customers.items.find((c) => c.email === ticket.customerEmail);
  const className = "block truncate text-sm font-medium text-ink-900 dark:text-paper-100";
  return customer ? (
    <Link href={`/customers/${customer.id}`} className={`${className} hover:text-brand-500`}>
      {ticket.customer}
    </Link>
  ) : (
    <p className={className}>{ticket.customer}</p>
  );
}
