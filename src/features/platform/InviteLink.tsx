"use client";

import { Copy, MailCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui";
import type { InviteResult } from "@/services";
import { toast } from "@/store";

/** Outcome of an invite: emailed, or a link to hand over when email isn't set up. */
export function InviteLink({ email, invite }: { email: string; invite: InviteResult }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(invite.inviteUrl!);
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually");
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-ink-900/[0.02] p-4 text-sm dark:bg-paper-100/[0.03]">
      {invite.inviteEmailed ? (
        <p className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" /> An invite to set a password was emailed to {email}.
        </p>
      ) : (
        <p className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> The invite email couldn&apos;t be sent (is email set up?). Send this
          link to {email} yourself.
        </p>
      )}
      {invite.inviteUrl && (
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-ink-900/5 px-2.5 py-1.5 font-mono text-xs dark:bg-paper-100/10">
            {invite.inviteUrl}
          </code>
          <Button type="button" variant="secondary" size="sm" onClick={copy}>
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
        </div>
      )}
      <p className="text-xs text-ink-900/45 dark:text-paper-100/45">The link works once and expires in 72 hours.</p>
    </div>
  );
}
