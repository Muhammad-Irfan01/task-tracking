"use client";

import { useCurrentUser } from "@/components/providers/SessionProvider";
import { FormModal, Input, Select, Switch } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useZodForm } from "@/hooks/useZodForm";
import { AGENT_ROLE_VALUES, agentSchema } from "@/lib/schemas";
import { toast, useDepartmentsStore, useStaffStore } from "@/store";
import type { Agent } from "@/types";
import type { EntityFormProps } from "./types";

export function AgentFormModal({ open, entity, onClose }: EntityFormProps<Agent>) {
  const user = useCurrentUser();
  const { create, update } = useStaffStore();
  const departments = useCollection(useDepartmentsStore);
  const form = useZodForm(agentSchema, {
    name: entity?.name ?? "",
    email: entity?.email ?? "",
    dept: entity?.dept ?? departments.items[0]?.name ?? "",
    role: (entity?.role as (typeof AGENT_ROLE_VALUES)[number]) ?? "Agent",
    isAdmin: entity?.isAdmin ?? false,
    active: entity?.active ?? true,
    onVacation: entity?.onVacation ?? false,
  });

  const onSubmit = form.handleSubmit(async (input) => {
    if (entity) {
      await update(entity.id, input);
      toast.success("Agent updated");
    } else {
      const agent = (await create(input)) as Agent & { inviteEmailed?: boolean };
      if (agent.inviteEmailed) toast.success(`${input.name} added — an invite to set their password was emailed to ${input.email}`);
      else toast.info(`${input.name} added, but the invite email couldn't be sent — the setup link is in the server log`);
    }
    onClose();
  });

  return (
    <FormModal open={open} onClose={onClose} title={entity ? "Edit agent" : "Add agent"} onSubmit={onSubmit} submitting={form.submitting}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" {...form.field("name")} />
        <Input
          label="Email"
          type="email"
          placeholder={user.tenantEmailDomain ? `name@${user.tenantEmailDomain}` : "name@company.com"}
          hint={user.tenantEmailDomain ? `Must be an @${user.tenantEmailDomain} address.` : undefined}
          {...form.field("email")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Department" {...form.field("dept")}>
          {!form.values.dept && <option value="">Choose…</option>}
          {departments.items.map((d) => (
            <option key={d.id}>{d.name}</option>
          ))}
        </Select>
        <Select label="Role" {...form.field("role")}>
          {AGENT_ROLE_VALUES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-3 rounded-xl bg-ink-900/[0.02] p-4 dark:bg-paper-100/[0.03]">
        <Switch label="Administrator" description="Can manage agents and workspace settings" checked={form.values.isAdmin} onChange={(v) => form.set("isAdmin", v)} />
        <Switch label="Active" description="Inactive agents can't sign in or take tickets" checked={form.values.active} onChange={(v) => form.set("active", v)} />
        <Switch label="On vacation" description="Skipped by automatic ticket assignment" checked={form.values.onVacation} onChange={(v) => form.set("onVacation", v)} />
      </div>
    </FormModal>
  );
}
