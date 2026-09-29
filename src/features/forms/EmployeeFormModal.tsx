"use client";

import { useCurrentUser } from "@/components/providers/SessionProvider";
import { FormModal, Input, Select, Switch } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useZodForm } from "@/hooks/useZodForm";
import { employeeSchema } from "@/lib/schemas";
import { toast, useDepartmentsStore, useEmployeesStore } from "@/store";
import type { Employee } from "@/types";
import type { EntityFormProps } from "./types";

export function EmployeeFormModal({ open, entity, onClose }: EntityFormProps<Employee>) {
  const user = useCurrentUser();
  const { create, update } = useEmployeesStore();
  const departments = useCollection(useDepartmentsStore);
  const form = useZodForm(employeeSchema, {
    name: entity?.name ?? "",
    email: entity?.email ?? "",
    dept: entity?.dept ?? departments.items[0]?.name ?? "",
    active: entity?.active ?? true,
  });

  const onSubmit = form.handleSubmit(async (input) => {
    if (entity) {
      await update(entity.id, input);
      toast.success("Employee updated");
    } else {
      const employee = (await create(input)) as Employee & { inviteEmailed?: boolean };
      if (employee.inviteEmailed) toast.success(`${input.name} added — an invite to the request portal was emailed to ${input.email}`);
      else toast.info(`${input.name} added, but the invite email couldn't be sent — the setup link is in the server log`);
    }
    onClose();
  });

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={entity ? "Edit employee" : "Add employee"}
      description="Employees sign in to the request portal to raise tickets and follow them. They can't see the desk."
      onSubmit={onSubmit}
      submitting={form.submitting}
    >
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
      <Select label="Their department" {...form.field("dept")}>
        {!form.values.dept && <option value="">Choose…</option>}
        {departments.items.map((d) => (
          <option key={d.id}>{d.name}</option>
        ))}
      </Select>
      <div className="rounded-xl bg-ink-900/[0.02] p-4 dark:bg-paper-100/[0.03]">
        <Switch
          label="Active"
          description="Inactive employees can't sign in and don't count toward the plan"
          checked={form.values.active}
          onChange={(v) => form.set("active", v)}
        />
      </div>
    </FormModal>
  );
}
