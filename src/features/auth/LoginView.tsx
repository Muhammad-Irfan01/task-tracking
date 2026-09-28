"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import { loginSchema } from "@/lib/schemas";
import { authService } from "@/services";
import { AUTH_LINK, AuthShell } from "./AuthShell";

export function LoginView({ next, notice }: { next: string; notice?: string }) {
  const router = useRouter();
  const form = useZodForm(loginSchema, { email: "", password: "" });

  const onSubmit = form.handleSubmit(async (credentials) => {
    await authService.login(credentials);
    router.replace(next);
    router.refresh();
  });

  return (
    <AuthShell
      title="Sign in to your desk"
      description="Use your agent account to continue."
      footer={
        <>
          <p>
            New to Threadline?{" "}
            <Link href="/signup" className={AUTH_LINK}>
              Create an account
            </Link>
          </p>
          <p className="mt-3 text-xs leading-relaxed text-ink-900/45 dark:text-paper-100/45">
            Demo workspace — any seeded agent email (e.g. <span className="font-mono">amara.chen@threadline.io</span>) with
            password <span className="font-mono">threadline</span>.
          </p>
        </>
      }
    >
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {notice}
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Input label="Email" type="email" autoComplete="email" placeholder="you@threadline.io" {...form.field("email")} />
        <div>
          <Input label="Password" type="password" autoComplete="current-password" {...form.field("password")} />
          <div className="mt-1.5 text-right">
            <Link
              href={form.values.email ? `/forgot-password?email=${encodeURIComponent(form.values.email)}` : "/forgot-password"}
              className="text-xs font-medium text-brand-500 hover:text-brand-600"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" className="w-full" loading={form.submitting}>
          <LogIn className="h-4 w-4" /> Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
