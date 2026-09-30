"use client";

import { BookOpen, ExternalLink, Paperclip, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackLink, Button, Card, EmptyState, Input, LinkButton, Select, Skeleton, Textarea } from "@/components/ui";
import { SelectedFiles, useAttachmentSelection } from "@/features/tickets/conversation";
import { useDebounce } from "@/hooks/useDebounce";
import { useZodForm } from "@/hooks/useZodForm";
import { TICKET_PRIORITIES } from "@/lib/constants";
import { ATTACHMENT_LIMITS, portalTicketSchema, type PortalTicketInput } from "@/lib/schemas";
import { errorMessage, portalService } from "@/services";
import { toast } from "@/store";
import type { HelpArticle, PortalOptions } from "@/types";

const PRIORITY_HINTS: Record<string, string> = {
  Low: "Whenever there's time",
  Normal: "Needed in the usual time",
  High: "Blocking part of my work",
  Emergency: "Blocking my work completely",
};

const STOP_WORDS = new Set(["the", "and", "for", "with", "not", "can't", "cannot", "won't", "does", "doesn't", "how", "what", "when", "my", "our", "your", "from", "this", "that", "have", "need", "into"]);

/** Published articles whose question shares words with the subject, best match first. */
function relatedArticles(articles: HelpArticle[], subject: string) {
  const words = subject
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  if (!words.length) return [];
  return articles
    .map((article) => {
      const text = `${article.question} ${article.category}`.toLowerCase();
      return { article, score: words.filter((w) => text.includes(w)).length };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((m) => m.article);
}

export function NewTicketView() {
  const router = useRouter();
  const [options, setOptions] = useState<PortalOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const attachments = useAttachmentSelection(options?.attachments ?? ATTACHMENT_LIMITS.database);
  const form = useZodForm(portalTicketSchema, {
    subject: "",
    department: "",
    topic: "",
    priority: "Normal",
    message: "",
  } satisfies PortalTicketInput);
  const { values, set } = form;

  useEffect(() => {
    portalService
      .options()
      .then((next) => {
        setOptions(next);
        const first = next.departments[0];
        if (first) {
          set("department", first.name);
          set("topic", first.topics[0] ?? "");
        }
      })
      .catch((e) => setLoadError(errorMessage(e)));
    // Suggestions are a convenience; the form works without them.
    portalService.helpArticles().then(setArticles).catch(() => {});
  }, [set]);

  const subject = useDebounce(values.subject, 300);
  const suggestions = useMemo(() => relatedArticles(articles, subject), [articles, subject]);

  const topics = options?.departments.find((d) => d.name === values.department)?.topics ?? [];

  function chooseDepartment(name: string) {
    set("department", name);
    set("topic", options?.departments.find((d) => d.name === name)?.topics[0] ?? "");
  }

  const onSubmit = form.handleSubmit(async (input) => {
    const ticket = await portalService.create(input);
    if (attachments.files.length) {
      try {
        await portalService.attachToNewTicket(ticket.id, attachments.files, options!.attachments.storage);
      } catch (e) {
        // The ticket exists either way; the files can still go in a reply.
        toast.error(`Ticket ${ticket.number} was sent, but the files weren't attached (${errorMessage(e)}). Add them in a reply.`);
        router.push(`/portal/tickets/${ticket.id}`);
        return;
      }
    }
    toast.success(`Ticket ${ticket.number} sent to ${ticket.department}`);
    router.push(`/portal/tickets/${ticket.id}`);
  });

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <BackLink href="/portal" label="Back to my tickets" className="mb-2" />
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-paper-100">New ticket</h1>
        <p className="mt-1 text-sm text-ink-900/50 dark:text-paper-100/50">
          Pick the department that should handle it. You&apos;ll be notified here when they reply.
        </p>
      </div>

      <Card className="p-6">
        {loadError && <p className="text-sm text-rose-500">{loadError}</p>}
        {!options && !loadError && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {options && options.departments.length === 0 && (
          <EmptyState
            title="No departments are taking requests yet"
            description="Ask your administrator to set up departments and help topics."
            action={
              <LinkButton href="/portal" variant="secondary">
                Back
              </LinkButton>
            }
          />
        )}
        {options && options.departments.length > 0 && (
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Department" {...form.field("department")} onChange={(e) => chooseDepartment(e.target.value)}>
                {options.departments.map((d) => (
                  <option key={d.name}>{d.name}</option>
                ))}
              </Select>
              <Select label="Topic" {...form.field("topic")}>
                {topics.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
            <Input label="Subject" placeholder="Short summary, e.g. “Laptop won't connect to VPN”" {...form.field("subject")} />
            {suggestions.length > 0 && (
              <div className="rounded-xl border border-brand-500/20 bg-brand-500/[0.04] p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-ink-900 dark:text-paper-100">
                  <BookOpen className="h-4 w-4 text-brand-500" /> These articles might answer it right away
                </p>
                <ul className="mt-2 space-y-1">
                  {suggestions.map((article) => (
                    <li key={article.id}>
                      <Link
                        href={`/portal/help/${article.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline dark:text-brand-300"
                      >
                        {article.question} <ExternalLink className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Select label="Priority" {...form.field("priority")}>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} — {PRIORITY_HINTS[p.name]}
                </option>
              ))}
            </Select>
            <Textarea
              label="Details"
              rows={7}
              placeholder="What do you need, and by when? Include anything that helps (steps, error messages, location…)."
              {...form.field("message")}
            />
            <div>
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) attachments.addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center gap-1.5 text-sm text-ink-900/50 hover:text-brand-500 dark:text-paper-100/50"
              >
                <Paperclip className="h-4 w-4" /> Attach files
                <span className="text-xs text-ink-900/35 dark:text-paper-100/35">
                  (screenshots, documents — up to {options.attachments.maxFiles} files, {options.attachments.maxTotalBytes / 1024 / 1024} MB in total)
                </span>
              </button>
              <SelectedFiles files={attachments.files} onRemove={attachments.remove} />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <LinkButton href="/portal" variant="secondary">
                Cancel
              </LinkButton>
              <Button type="submit" loading={form.submitting}>
                <Send className="h-4 w-4" /> Submit ticket
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
