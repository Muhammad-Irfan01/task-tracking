"use client";

import { useCurrentUser, useSession } from "@/components/providers/SessionProvider";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import { passwordSchema, profileSchema } from "@/lib/schemas";
import { accountService } from "@/services";
import { toast } from "@/store";

/** An employee's own profile and password. */
export function AccountView() {
  const user = useCurrentUser();
  const setUser = useSession((state) => state.setUser);
  const profile = useZodForm(profileSchema, { name: user.name, email: user.email });
  const password = useZodForm(passwordSchema, { current: "", next: "", confirm: "" });

  const saveProfile = profile.handleSubmit(async (input) => {
    setUser(await accountService.updateProfile(input));
    toast.success("Profile saved");
  });

  const savePassword = password.handleSubmit(async (input) => {
    await accountService.changePassword(input);
    password.reset({ current: "", next: "", confirm: "" });
    toast.success("Password updated — other sessions have been signed out");
  });

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Account" description={`${user.dept} · ${user.tenantName}`} />
      <Card className="p-6">
        <h2 className="mb-4 font-display font-semibold text-ink-900 dark:text-paper-100">Profile</h2>
        <form onSubmit={saveProfile} noValidate className="space-y-4">
          <Input label="Display name" autoComplete="name" {...profile.field("name")} />
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            hint={user.tenantEmailDomain ? `Used to sign in. Must stay an @${user.tenantEmailDomain} address.` : "Used to sign in."}
            {...profile.field("email")}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={profile.submitting}>
              Save profile
            </Button>
          </div>
        </form>
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 font-display font-semibold text-ink-900 dark:text-paper-100">Password</h2>
        <form onSubmit={savePassword} noValidate className="space-y-4">
          <Input label="Current password" type="password" autoComplete="current-password" {...password.field("current")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters, a letter and a number." {...password.field("next")} />
            <Input label="Confirm new password" type="password" autoComplete="new-password" {...password.field("confirm")} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={password.submitting}>
              Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
