"use client";

import { FileText, MessageSquareText, Paperclip, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Avatar, Button, Card, Select, Textarea } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { formatBytes } from "@/lib/format";
import { ATTACHMENT_LIMITS } from "@/lib/schemas";
import { cn, timeAgo } from "@/lib/utils";
import { errorMessage, ticketsService } from "@/services";
import { toast, useCannedResponsesStore, useTicketsStore } from "@/store";
import type { Attachment, Ticket, TicketMessage } from "@/types";

function AttachmentChip({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.type.startsWith("image/");
  return (
    <a
      href={attachment.url}
      download={attachment.name}
      className="group inline-flex max-w-full items-center gap-2 rounded-lg border border-ink-900/10 bg-white px-2.5 py-1.5 text-xs hover:border-brand-500 dark:border-paper-100/10 dark:bg-ink-800"
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- authenticated same-origin blob, not an optimizable asset
        <img src={`${attachment.url}?inline=1`} alt="" className="h-8 w-8 rounded object-cover" />
      ) : (
        <FileText className="h-4 w-4 shrink-0 text-brand-500" />
      )}
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink-900 group-hover:text-brand-500 dark:text-paper-100">{attachment.name}</span>
        <span className="block text-ink-900/45 dark:text-paper-100/45">{formatBytes(attachment.size)}</span>
      </span>
    </a>
  );
}

interface TicketConversationProps {
  ticket: Ticket;
  messages: TicketMessage[];
}

export function TicketConversation({ ticket, messages }: TicketConversationProps) {
  const reply = useTicketsStore((state) => state.reply);
  const canned = useCollection(useCannedResponsesStore);
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  // Database limits are the safe default until the server says blob storage is on.
  const [limits, setLimits] = useState(ATTACHMENT_LIMITS.database);

  useEffect(() => {
    let active = true;
    ticketsService
      .attachmentLimits(ticket.id)
      .then((next) => active && setLimits(next))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [ticket.id]);

  const templates = canned.items.filter((r) => r.enabled);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const mb = (bytes: number) => bytes / 1024 / 1024;
    const next = [...files];
    const rejected: string[] = [];
    for (const file of incoming) {
      const total = next.reduce((sum, f) => sum + f.size, 0) + file.size;
      if (next.length >= limits.maxFiles || file.size > limits.maxBytes || total > limits.maxTotalBytes) rejected.push(file.name);
      else next.push(file);
    }
    if (rejected.length) {
      const perFile = limits.maxBytes < limits.maxTotalBytes ? `, ${mb(limits.maxBytes)} MB each` : "";
      toast.error(`${rejected.join(", ")} not added — up to ${limits.maxFiles} files and ${mb(limits.maxTotalBytes)} MB per reply${perFile}`);
    }
    setFiles(next);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  }

  function insertTemplate(id: string) {
    const template = templates.find((t) => String(t.id) === id);
    if (!template) return;
    const greeting = `Hi ${ticket.customer.split(" ")[0]},\n\n`;
    setDraft((current) => (current.trim() ? `${current.trimEnd()}\n\n${template.body}` : `${greeting}${template.body}`));
  }

  async function send() {
    if (!draft.trim() && files.length === 0) return;
    setSending(true);
    try {
      await reply(ticket.id, draft, files, limits.storage);
      toast.success(`Reply sent to ${ticket.customer}`);
      setDraft("");
      setFiles([]);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display font-semibold text-ink-900 dark:text-paper-100">
        Conversation <span className="text-sm font-normal text-ink-900/40 dark:text-paper-100/40">· {messages.length}</span>
      </h2>
      <div className="space-y-5">
        {messages.map((message, i) => (
          <FadeIn key={message.id} index={Math.min(i, 10)} step={0.04} offset={8} className="flex gap-3">
            <Avatar name={message.author} size="sm" color={message.isStaff ? "bg-brand-500" : "bg-slate-400"} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-ink-900 dark:text-paper-100">{message.author}</p>
                {message.isStaff && (
                  <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-500">
                    Agent
                  </span>
                )}
                <span className="text-xs text-ink-900/40 dark:text-paper-100/40" title={new Date(message.created).toLocaleString()}>
                  {timeAgo(message.created)}
                </span>
              </div>
              {message.body && (
                <div className="surface mt-1.5 whitespace-pre-line rounded-xl px-4 py-3 text-sm leading-relaxed text-ink-800 dark:text-paper-100/85">
                  {message.body}
                </div>
              )}
              {message.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.attachments.map((a) => (
                    <AttachmentChip key={a.id} attachment={a} />
                  ))}
                </div>
              )}
            </div>
          </FadeIn>
        ))}
      </div>

      <div
        className={cn(
          "relative mt-6 rounded-xl border-t border-ink-900/[0.06] pt-4 transition-colors dark:border-paper-100/[0.06]",
          dragging && "bg-brand-500/5",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="reply" className="text-sm font-medium text-ink-700 dark:text-paper-100/80">
            Reply to customer
          </label>
          {templates.length > 0 && (
            <div className="flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5 text-ink-900/40 dark:text-paper-100/40" />
              <Select
                aria-label="Insert canned response"
                value=""
                onChange={(e) => insertTemplate(e.target.value)}
                className="py-1.5 text-xs"
              >
                <option value="">Insert canned response…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
        <Textarea
          id="reply"
          placeholder={`Type your response… (Ctrl+Enter to send, drop files to attach — up to ${limits.maxBytes / 1024 / 1024} MB)`}
          value={draft}
          rows={5}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
          }}
        />

        <AnimatePresence initial={false}>
          {files.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 pt-3">
                {files.map((file, i) => (
                  <span
                    key={`${file.name}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900/[0.04] py-1 pl-2.5 pr-1 text-xs dark:bg-paper-100/[0.06]"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-40 truncate">{file.name}</span>
                    <span className="text-ink-900/40 dark:text-paper-100/40">{formatBytes(file.size)}</span>
                    <button
                      onClick={() => setFiles((current) => current.filter((_, j) => j !== i))}
                      aria-label={`Remove ${file.name}`}
                      className="rounded p-0.5 hover:bg-ink-900/10 dark:hover:bg-paper-100/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3 flex items-center justify-between">
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm text-ink-900/50 hover:text-brand-500 dark:text-paper-100/50"
          >
            <Paperclip className="h-4 w-4" /> Attach files
          </button>
          <Button onClick={send} loading={sending} disabled={!draft.trim() && files.length === 0}>
            <Send className="h-4 w-4" /> Send reply
          </Button>
        </div>
      </div>
    </Card>
  );
}
