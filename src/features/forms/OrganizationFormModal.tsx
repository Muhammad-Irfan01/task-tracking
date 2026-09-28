"use client";

import { FormModal, Input, Select } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import { organizationSchema } from "@/lib/schemas";
import { toast, useOrganizationsStore } from "@/store";
import type { Organization } from "@/types";
import type { EntityFormProps } from "./types";

export function OrganizationFormModal({ open, entity, onClose }: EntityFormProps<Organization>) {
  const { create, update } = useOrganizationsStore();
  const form = useZodForm(organizationSchema, {
    name: entity?.name ?? "",
    domain: entity?.domain ?? "",
    status: entity?.status ?? "Active",
  });

  const onSubmit = form.handleSubmit(async (input) => {
    if (entity) await update(entity.id, input);
    else await create(input);
    toast.success(entity ? "Organization updated" : `${input.name} added`);
    onClose();
  });

  return (
    <FormModal open={open} onClose={onClose} title={entity ? "Edit organization" : "Add organization"} onSubmit={onSubmit} submitting={form.submitting}>
      <Input label="Name" placeholder="Acme Corporation" {...form.field("name")} />
      <Input label="Email domain" placeholder="acme.com" hint="Use — for customers without a company domain." {...form.field("domain")} />
      <Select label="Status" {...form.field("status")}>
        <option>Active</option>
        <option>Inactive</option>
      </Select>
    </FormModal>
  );
}
