"use client";

import { CheckCircle2, FileQuestionMark, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge, BackLink, Button, Card, EmptyState, LinkButton, PriorityDot, RowSkeleton, Skeleton } from "@/components/ui";
import { MessageList, ReplyComposer } from "@/features/tickets/conversation";
import { useIsClient } from "@/hooks/useIsClient";
import { isClosedStatus } from "@/lib/constants";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { errorMessage, portalService } from "@/services";
import { confirm, toast } from "@/store";
import type { Ticket, TicketMessage } from "@/types";

const POLL_MS = 20_000;

export function PortalTicketView({ id }: { id: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const isClient = useIsClient();

  const refresh = useCallback(
    () =>
      Promise.all([portalService.ticket(id), portalService.messages(id)])
        .then(([t, m]) => {
          setTicket(t);
          setMessages(m);
        })
        .catch(() => setMissing(true)),
    [id],
  );

  // Pick up agent replies and status changes while the page is open.
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const loadLimits = useCallback(() => portalService.attachmentLimits(id), [id]);

  if (missing && !ticket) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={FileQuestionMark}
          title="Ticket not found"
          description="It doesn't exist, or it isn't one of your tickets."
          action={
            <LinkButton href="/portal" variant="secondary">
              Back to my tickets
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const closed = ticket ? isClosedStatus(ticket.status) : false;

  async function changeStatus(status: "Resolved" | "Open") {
    if (status === "Resolved") {
      const ok = await confirm({
        title: "Mark this ticket as resolved?",
        description: "Do this when you no longer need help. You can reopen it later if the problem comes back.",
        confirmLabel: "Mark resolved",
        tone: "primary",
      });
      if (!ok) return;
    }
    setUpdating(true);
    try {
      setTicket(await portalService.setStatus(id, status));
      toast.success(status === "Resolved" ? "Ticket resolved — thanks!" : "Ticket reopened; the team has been notified");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-5">
      <BackLink href="/portal" label="Back to my tickets" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            {ticket ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="font-display text-xl font-semibold text-ink-900 dark:text-paper-100">{ticket.subject}</h1>
                    <p className="mt-1 font-mono text-sm text-ink-900/45 dark:text-paper-100/45">
                      {ticket.number} · Opened {formatDateTime(ticket.created)}
                    </p>
                  </div>
                  <Badge status={ticket.status} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-900/[0.06] pt-3 dark:border-paper-100/[0.06]">
                  <p className="text-sm text-ink-900/60 dark:text-paper-100/60">
                    {closed
                      ? `Resolved ${isClient ? relativeTime(ticket.resolvedAt) : ""}`
                      : ticket.assignee === "Unassigned"
                        ? "Waiting for an agent to pick this up"
                        : `${ticket.assignee} is working on it`}
                  </p>
                  {closed ? (
                    <Button variant="secondary" size="sm" onClick={() => changeStatus("Open")} loading={updating}>
                      <RotateCcw className="h-4 w-4" /> Reopen
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => changeStatus("Resolved")} loading={updating}>
                      <CheckCircle2 className="h-4 w-4" /> Mark resolved
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-display font-semibold text-ink-900 dark:text-paper-100">
              Conversation
              {messages && <span className="text-sm font-normal text-ink-900/40 dark:text-paper-100/40"> · {messages.length}</span>}
            </h2>
            {messages ? (
              <MessageList messages={messages} staffLabel="Support" requesterLabel="You" />
            ) : (
              [0, 1].map((i) => <RowSkeleton key={i} />)
            )}
            {ticket && (
              <ReplyComposer
                label={closed ? "Add a message (this ticket is resolved — reopen it if you still need help)" : "Add an update or reply"}
                submitLabel="Send"
                loadLimits={loadLimits}
                onSend={async (body, files, storage) => {
                  const { message, ticket: next } = await portalService.reply(id, body, files, storage);
                  setMessages((current) => [...(current ?? []), message]);
                  setTicket(next);
                  toast.success("Sent");
                }}
              />
            )}
          </Card>
        </div>

        <Card className="h-fit space-y-3 p-5">
          <h2 className="font-display font-semibold text-ink-900 dark:text-paper-100">Details</h2>
          {ticket ? (
            <dl className="space-y-2.5 text-sm">
              {[
                ["Department", ticket.department],
                ["Topic", ticket.topic],
                [
                  "Priority",
                  <span key="p" className="inline-flex items-center gap-2">
                    <PriorityDot priority={ticket.priority} /> {ticket.priority}
                  </span>,
                ],
                ["Assigned to", ticket.assignee === "Unassigned" ? "Not yet" : ticket.assignee],
                ["Last update", isClient ? relativeTime(ticket.updated) : ""],
                closed ? ["Resolved", formatDateTime(ticket.resolvedAt)] : ["Expected response", isClient ? relativeTime(ticket.dueAt) : ""],
              ].map(([term, value]) => (
                <div key={String(term)} className="flex justify-between gap-3">
                  <dt className="text-ink-900/50 dark:text-paper-100/50">{term}</dt>
                  <dd className="text-right font-medium text-ink-900 dark:text-paper-100">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
