"use client";

import { CheckCircle2, FileQuestionMark, RotateCcw, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge, BackLink, Button, Card, EmptyState, LinkButton, PriorityDot, RowSkeleton, Skeleton, Textarea } from "@/components/ui";
import { MessageList, ReplyComposer } from "@/features/tickets/conversation";
import { useIsClient } from "@/hooks/useIsClient";
import { isClosedStatus } from "@/lib/constants";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { errorMessage, portalService } from "@/services";
import { confirm, toast } from "@/store";
import type { Ticket, TicketMessage } from "@/types";

const POLL_MS = 20_000;
const RATING_LABELS = ["", "Very poor", "Poor", "Okay", "Good", "Excellent"];

/** After a ticket is resolved: how did support do? (1–5 stars and an optional comment; can be changed.) */
function RateTicket({ ticket, onRated }: { ticket: Ticket; onRated: (t: Ticket) => void }) {
  const [editing, setEditing] = useState(!ticket.rating);
  const [rating, setRating] = useState(ticket.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(ticket.ratingComment ?? "");
  const [saving, setSaving] = useState(false);
  const shown = hover || rating;

  async function submit() {
    setSaving(true);
    try {
      onRated(await portalService.rate(ticket.id, rating, comment));
      setEditing(false);
      toast.success("Thanks for your feedback!");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!editing && ticket.rating) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-medium text-ink-900 dark:text-paper-100">
            You rated this{" "}
            <span className="text-amber-500" aria-label={`${ticket.rating} out of 5`}>
              {"★".repeat(ticket.rating)}
              <span className="text-ink-900/20 dark:text-paper-100/20">{"★".repeat(5 - ticket.rating)}</span>
            </span>
          </p>
          {ticket.ratingComment && <p className="mt-1 text-sm text-ink-900/60 dark:text-paper-100/60">“{ticket.ratingComment}”</p>}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Change
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-5">
      <div>
        <h2 className="font-display font-semibold text-ink-900 dark:text-paper-100">How did we do?</h2>
        <p className="text-sm text-ink-900/50 dark:text-paper-100/50">Your rating helps the team improve. Only they see it.</p>
      </div>
      <div className="flex items-center gap-3">
        <div role="radiogroup" aria-label="Rating" className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} — ${RATING_LABELS[value]}`}
              onMouseEnter={() => setHover(value)}
              onClick={() => setRating(value)}
              className="rounded p-0.5 focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <Star className={cn("h-7 w-7 transition-colors", value <= shown ? "fill-amber-400 text-amber-400" : "text-ink-900/20 dark:text-paper-100/20")} />
            </button>
          ))}
        </div>
        <span className="text-sm text-ink-900/60 dark:text-paper-100/60">{RATING_LABELS[shown]}</span>
      </div>
      <Textarea
        aria-label="Comment (optional)"
        rows={2}
        maxLength={1000}
        placeholder="Anything you'd like to add? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        {ticket.rating && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={submit} loading={saving} disabled={!rating}>
          Send feedback
        </Button>
      </div>
    </Card>
  );
}

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

          {ticket && closed && <RateTicket key={`${ticket.id}-${ticket.rating ?? 0}`} ticket={ticket} onRated={setTicket} />}

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
