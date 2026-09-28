"use client";

import { FormModal, Input, Select } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useZodForm } from "@/hooks/useZodForm";
import { helpTopicSchema } from "@/lib/schemas";
import { toast, useDepartmentsStore, useHelpTopicsStore, useSlaPlansStore } from "@/store";
import type { HelpTopic } from "@/types";
import type { EntityFormProps } from "./types";

export function HelpTopicFormModal({ open, entity, onClose }: EntityFormProps<HelpTopic>) {
  const { create, update } = useHelpTopicsStore();
  const departments = useCollection(useDepartmentsStore);
  const plans = useCollection(useSlaPlansStore);
  const form = useZodForm(helpTopicSchema, {
    name: entity?.name ?? "",
    dept: entity?.dept ?? "",
    sla: entity?.sla ?? "",
  });

  const onSubmit = form.handleSubmit(async (input) => {
    if (entity) await update(entity.id, input);
    else await create(input);
    toast.success(entity ? "Help topic updated" : `${input.name} created`);
    onClose();
  });

  return (
    <FormModal open={open} onClose={onClose} title={entity ? "Edit help topic" : "Add help topic"} onSubmit={onSubmit} submitting={form.submitting}>
      <Input label="Topic name" placeholder="e.g. Warranty Claim" {...form.field("name")} />
      <Select label="Routed department" {...form.field("dept")}>
        <option value="">Choose a department…</option>
        {departments.items.map((d) => (
          <option key={d.id}>{d.name}</option>
        ))}
      </Select>
      <Select label="SLA plan" {...form.field("sla")}>
        <option value="">Choose a plan…</option>
        {plans.items.map((p) => (
          <option key={p.id} value={p.name}>
            {p.name} ({p.graceHours}h)
          </option>
        ))}
      </Select>
    </FormModal>
  );
}
