"use client";

import { KeyRound, LinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, LinkButton } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import { resetPasswordSchema } from "@/lib/schemas";
import { authService } from "@/services";
import { toast } from "@/store";
import { AUTH_LINK, AuthShell } from "./AuthShell";
import { PasswordStrength } from "./PasswordStrength";

export type ResetTokenState =
  | { status: "missing" | "invalid" }
  | { status: "valid"; email: string; purpose: "reset" | "invite" };

export function ResetPasswordView({ token, state }: { token: string; state: ResetTokenState }) {
  const router = useRouter();
  const form = useZodForm(resetPasswordSchema, { token, password: "", confirm: "" });

  const onSubmit = form.handleSubmit(async (input) => {
    const user = await authService.resetPassword(input);
    toast.success(state.status === "valid" && state.purpose === "invite" ? `Welcome aboard, ${user.firstName}!` : "Password updated — you're signed in");
    router.replace("/");
    router.refresh();
  });

  if (state.status !== "valid") {
    return (
      <AuthShell
        title="This link can't be used"
        description={
          state.status === "missing"
            ? "The reset link is incomplete. Open it straight from the email."
            : "Reset links expire after 30 minutes and work only once."
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center py-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <LinkIcon className="h-5 w-5" />
            </span>
          </div>
          <LinkButton href="/forgot-password" className="w-full">
            Request a new link
          </LinkButton>
          <Link href="/login" className={`${AUTH_LINK} text-center text-sm`}>
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  const invite = state.purpose === "invite";

  return (
    <AuthShell
      title={invite ? "Set up your password" : "Choose a new password"}
      description={
        <>
          For <span className="font-medium text-ink-900 dark:text-paper-100">{state.email}</span>
          {invite ? " — welcome to the desk." : ". Other sessions will be signed out."}
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {form.errors.token && (
          <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
            {form.errors.token}{" "}
            <Link href="/forgot-password" className="font-medium underline">
              Request a new link
            </Link>
          </p>
        )}
        {/* Lets password managers associate the new password with the account. */}
        <input type="email" name="username" autoComplete="username" value={state.email} readOnly hidden />
        <div>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters, including a letter and a number."
            {...form.field("password")}
          />
          <PasswordStrength password={form.values.password} />
        </div>
        <Input label="Confirm new password" type="password" autoComplete="new-password" {...form.field("confirm")} />
        <Button type="submit" className="w-full" loading={form.submitting}>
          <KeyRound className="h-4 w-4" /> {invite ? "Set password & sign in" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
