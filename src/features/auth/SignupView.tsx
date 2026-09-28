"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import { signupSchema } from "@/lib/schemas";
import { authService } from "@/services";
import { toast } from "@/store";
import { AUTH_LINK, AuthShell } from "./AuthShell";
import { PasswordStrength } from "./PasswordStrength";

export function SignupView({ departments }: { departments: string[] }) {
  const router = useRouter();
  const form = useZodForm(signupSchema, {
    name: "",
    email: "",
    dept: departments[0] ?? "",
    password: "",
    confirm: "",
  });

  const onSubmit = form.handleSubmit(async (input) => {
    const user = await authService.signup(input);
    toast.success(`Welcome to Threadline, ${user.firstName}!`);
    router.replace("/");
    router.refresh();
  });

  return (
    <AuthShell
      title="Create your agent account"
      description="Join the support desk in a few seconds."
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className={AUTH_LINK}>
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Input label="Full name" autoComplete="name" placeholder="Jane Doe" {...form.field("name")} />
        <Input label="Work email" type="email" autoComplete="email" placeholder="jane@threadline.io" {...form.field("email")} />
        <Select label="Department" {...form.field("dept")}>
          {departments.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </Select>
        <div>
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters, including a letter and a number."
            {...form.field("password")}
          />
          <PasswordStrength password={form.values.password} />
        </div>
        <Input label="Confirm password" type="password" autoComplete="new-password" {...form.field("confirm")} />
        <Button type="submit" className="w-full" loading={form.submitting}>
          <UserPlus className="h-4 w-4" /> Create account
        </Button>
      </form>
    </AuthShell>
  );
}
