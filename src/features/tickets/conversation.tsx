"use client";

import { FileText, Lock, MessageSquareText, Paperclip, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Avatar, Button, Select, Textarea } from "@/components/ui";
import { formatBytes } from "@/lib/format";
import { ATTACHMENT_LIMITS, type AttachmentLimits, type AttachmentStorage } from "@/lib/schemas";
import { cn, timeAgo } from "@/lib/utils";
import { errorMessage } from "@/services";
import { toast } from "@/store";
import type { Attachment, TicketMessage } from "@/types";

/**
 * Conversation building blocks shared by the agent desk and the employee
 * portal: the message list, attachment chips and the reply box.
 */

export function AttachmentChip({ attachment }: { attachment: Attachment }) {
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

interface MessageListProps {
  messages: TicketMessage[];
  /** Badge on staff messages ("Agent"). */
  staffLabel?: string;
  /** Badge on the requester's own messages (e.g. "You" in the portal). */
  requesterLabel?: string;
}

export function MessageList({ messages, staffLabel = "Agent", requesterLabel }: MessageListProps) {
  return (
    <div className="space-y-5">
      {messages.map((message, i) => (
        <FadeIn key={message.id} index={Math.min(i, 10)} step={0.04} offset={8} className="flex gap-3">
          <Avatar name={message.author} size="sm" color={message.isInternal ? "bg-amber-500" : message.isStaff ? "bg-brand-500" : "bg-slate-400"} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-ink-900 dark:text-paper-100">{message.author}</p>
              {message.isInternal ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  <Lock className="h-2.5 w-2.5" /> Internal note
                </span>
              ) : (message.isStaff ? staffLabel : requesterLabel) && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    message.isStaff ? "bg-brand-500/10 text-brand-500" : "bg-slate-500/10 text-slate-500",
                  )}
                >
                  {message.isStaff ? staffLabel : requesterLabel}
                </span>
              )}
              <span className="text-xs text-ink-900/40 dark:text-paper-100/40" title={new Date(message.created).toLocaleString()}>
                {timeAgo(message.created)}
              </span>
            </div>
            {message.body && (
              <div
                className={cn(
                  "mt-1.5 whitespace-pre-line rounded-xl px-4 py-3 text-sm leading-relaxed text-ink-800 dark:text-paper-100/85",
                  message.isInternal ? "border border-dashed border-amber-500/40 bg-amber-500/[0.06]" : "surface",
                )}
              >
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
  );
}

const mb = (bytes: number) => bytes / 1024 / 1024;

/** Files picked for one message, kept within the server's attachment limits. */
export function useAttachmentSelection(limits: AttachmentLimits) {
  const [files, setFiles] = useState<File[]>([]);

  function addFiles(list: FileList | File[]) {
    const next = [...files];
    const rejected: string[] = [];
    for (const file of Array.from(list)) {
      const total = next.reduce((sum, f) => sum + f.size, 0) + file.size;
      if (next.length >= limits.maxFiles || file.size > limits.maxBytes || total > limits.maxTotalBytes) rejected.push(file.name);
      else next.push(file);
    }
    if (rejected.length) {
      const perFile = limits.maxBytes < limits.maxTotalBytes ? `, ${mb(limits.maxBytes)} MB each` : "";
      toast.error(`${rejected.join(", ")} not added — up to ${limits.maxFiles} files and ${mb(limits.maxTotalBytes)} MB per message${perFile}`);
    }
    setFiles(next);
  }

  return {
    files,
    addFiles,
    remove: (index: number) => setFiles((current) => current.filter((_, j) => j !== index)),
    clear: () => setFiles([]),
  };
}

/** The picked files as removable chips. */
export function SelectedFiles({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  return (
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
                  type="button"
                  onClick={() => onRemove(i)}
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
  );
}

export interface ReplyTemplate {
  id: number;
  title: string;
  body: string;
}

interface ReplyComposerProps {
  label: string;
  submitLabel?: string;
  /** Where the attachment limits for this ticket come from. */
  loadLimits: () => Promise<AttachmentLimits>;
  /** `internal` is true when an agent sends it as an internal note. */
  onSend: (body: string, files: File[], storage: AttachmentStorage, internal: boolean) => Promise<void>;
  /** Agent desk only: offer "Internal note" next to the reply. */
  allowInternal?: boolean;
  /** Agent desk only: canned responses offered above the box. */
  templates?: ReplyTemplate[];
  /** Name used for the greeting when a template starts the reply. */
  greetingName?: string;
}

/** Reply textarea with drag-and-drop attachments, checked against the server's limits. */
export function ReplyComposer({
  label,
  submitLabel = "Send reply",
  loadLimits,
  onSend,
  templates = [],
  greetingName,
  allowInternal = false,
}: ReplyComposerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  // Database limits are the safe default until the server says blob storage is on.
  const [limits, setLimits] = useState<AttachmentLimits>(ATTACHMENT_LIMITS.database);
  const { files, addFiles, remove, clear } = useAttachmentSelection(limits);

  useEffect(() => {
    let active = true;
    loadLimits()
      .then((next) => active && setLimits(next))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [loadLimits]);

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  }

  function insertTemplate(id: string) {
    const template = templates.find((t) => String(t.id) === id);
    if (!template) return;
    const greeting = greetingName ? `Hi ${greetingName.split(" ")[0]},\n\n` : "";
    setDraft((current) => (current.trim() ? `${current.trimEnd()}\n\n${template.body}` : `${greeting}${template.body}`));
  }

  async function send() {
    if (!draft.trim() && files.length === 0) return;
    setSending(true);
    try {
      await onSend(draft, files, limits.storage, internal);
      setDraft("");
      clear();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={cn(
        "relative mt-6 rounded-xl border-t border-ink-900/[0.06] pt-4 transition-colors dark:border-paper-100/[0.06]",
        dragging && "bg-brand-500/5",
        internal && "bg-amber-500/[0.04]",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="mb-1.5 flex items-center justify-between gap-3">
        {allowInternal ? (
          <div role="radiogroup" aria-label="Message type" className="inline-flex rounded-lg bg-ink-900/[0.04] p-0.5 text-sm dark:bg-paper-100/[0.06]">
            {[
              { value: false, text: label },
              { value: true, text: "Internal note" },
            ].map((option) => (
              <button
                key={option.text}
                type="button"
                role="radio"
                aria-checked={internal === option.value}
                onClick={() => setInternal(option.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors",
                  internal === option.value
                    ? option.value
                      ? "bg-white text-amber-600 shadow-sm dark:bg-ink-800 dark:text-amber-400"
                      : "bg-white text-ink-900 shadow-sm dark:bg-ink-800 dark:text-paper-100"
                    : "text-ink-900/50 hover:text-ink-900 dark:text-paper-100/50 dark:hover:text-paper-100",
                )}
              >
                {option.value && <Lock className="h-3.5 w-3.5" />}
                {option.text}
              </button>
            ))}
          </div>
        ) : (
          <label htmlFor="reply" className="text-sm font-medium text-ink-700 dark:text-paper-100/80">
            {label}
          </label>
        )}
        {templates.length > 0 && !internal && (
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
        aria-label={allowInternal ? (internal ? "Internal note" : label) : undefined}
        placeholder={
          internal
            ? "Only agents see internal notes — the requester is never shown or notified. (Ctrl+Enter to save)"
            : `Type your response… (Ctrl+Enter to send, drop files to attach — up to ${limits.maxBytes / 1024 / 1024} MB)`
        }
        value={draft}
        rows={5}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
        }}
      />

      <SelectedFiles files={files} onRemove={remove} />

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
        <Button
          onClick={send}
          loading={sending}
          disabled={!draft.trim() && files.length === 0}
          className={internal ? "bg-amber-500 hover:bg-amber-600" : undefined}
        >
          {internal ? <Lock className="h-4 w-4" /> : <Send className="h-4 w-4" />} {internal ? "Save note" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
