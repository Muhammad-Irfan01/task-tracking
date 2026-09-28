"use client";

import { MailCheck, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import { forgotPasswordSchema } from "@/lib/schemas";
import { authService } from "@/services";
import { AUTH_LINK, AuthShell } from "./AuthShell";

export function ForgotPasswordView({ initialEmail = "" }: { initialEmail?: string }) {
  const form = useZodForm(forgotPasswordSchema, { email: initialEmail });
  const [sent, setSent] = useState<{ email: string; devResetUrl?: string } | null>(null);

  const onSubmit = form.handleSubmit(async (input) => {
    const result = await authService.forgotPassword(input);
    setSent({ email: input.email, devResetUrl: result.devResetUrl });
  });

  return (
    <AuthShell
      title={sent ? "Check your email" : "Forgot your password?"}
      description={sent ? undefined : "Enter your account email and we'll send you a reset link."}
      footer={
        <p>
          Remembered it?{" "}
          <Link href="/login" className={AUTH_LINK}>
            Back to sign in
          </Link>
        </p>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex gap-3 rounded-xl bg-emerald-500/10 p-4">
              <MailCheck className="h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-sm leading-relaxed text-ink-900/70 dark:text-paper-100/70">
                If an account exists for <span className="font-medium text-ink-900 dark:text-paper-100">{sent.email}</span>, a
                reset link is on its way. It expires in 30 minutes.
              </p>
            </div>
            {sent.devResetUrl && (
              <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-xs text-ink-900/60 dark:text-paper-100/60">
                <p className="font-semibold text-amber-600 dark:text-amber-400">Development mode</p>
                <p className="mt-1">No email provider is configured, so here&apos;s the link that was sent (also printed in the server log):</p>
                <Link href={sent.devResetUrl.replace(/^https?:\/\/[^/]+/, "")} className={`${AUTH_LINK} mt-2 block break-all`}>
                  Open reset link →
                </Link>
              </div>
            )}
            <Button variant="secondary" className="w-full" onClick={() => setSent(null)}>
              Use a different email
            </Button>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onSubmit={onSubmit} noValidate className="space-y-4">
            <Input label="Email" type="email" autoComplete="email" placeholder="you@threadline.io" {...form.field("email")} />
            <Button type="submit" className="w-full" loading={form.submitting}>
              <Send className="h-4 w-4" /> Send reset link
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
