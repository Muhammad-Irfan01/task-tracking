"use client";

import { FormModal, Input, Select } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useZodForm } from "@/hooks/useZodForm";
import { CUSTOMER_STATUS_VALUES, customerSchema } from "@/lib/schemas";
import { toast, useCustomersStore, useOrganizationsStore } from "@/store";
import type { Customer } from "@/types";
import type { EntityFormProps } from "./types";

export function CustomerFormModal({ open, entity, onClose, onSaved }: EntityFormProps<Customer>) {
  const { create, update } = useCustomersStore();
  const orgs = useCollection(useOrganizationsStore);
  const form = useZodForm(customerSchema, {
    name: entity?.name ?? "",
    email: entity?.email ?? "",
    phone: entity?.phone ?? "",
    organization: entity?.organization ?? "Independent Customers",
    status: entity?.status ?? "Active",
  });

  const onSubmit = form.handleSubmit(async (input) => {
    const saved = entity ? await update(entity.id, input) : await create(input);
    toast.success(entity ? "Customer updated" : `${saved.name} added`);
    onSaved?.(saved);
    onClose();
  });

  return (
    <FormModal open={open} onClose={onClose} title={entity ? "Edit customer" : "Add customer"} onSubmit={onSubmit} submitting={form.submitting}>
      <Input label="Full name" placeholder="Jane Doe" {...form.field("name")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Email" type="email" placeholder="jane@company.com" {...form.field("email")} />
        <Input label="Phone" type="tel" placeholder="+1 555 0100" {...form.field("phone")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Organization" {...form.field("organization")}>
          {orgs.items.map((o) => (
            <option key={o.id}>{o.name}</option>
          ))}
        </Select>
        <Select label="Status" {...form.field("status")}>
          {CUSTOMER_STATUS_VALUES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>
    </FormModal>
  );
}
