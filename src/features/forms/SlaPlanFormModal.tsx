"use client";

import { FormModal, Input, Textarea } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import { slaPlanSchema } from "@/lib/schemas";
import { toast, useSlaPlansStore } from "@/store";
import type { SlaPlan } from "@/types";
import type { EntityFormProps } from "./types";

export function SlaPlanFormModal({ open, entity, onClose }: EntityFormProps<SlaPlan>) {
  const { create, update } = useSlaPlansStore();
  const form = useZodForm(slaPlanSchema, {
    name: entity?.name ?? "",
    graceHours: entity?.graceHours ?? 24,
    notes: entity?.notes ?? "",
  });

  const onSubmit = form.handleSubmit(async (input) => {
    if (entity) await update(entity.id, input);
    else await create(input);
    toast.success(entity ? "SLA plan updated" : `${input.name} created`);
    onClose();
  });

  return (
    <FormModal open={open} onClose={onClose} title={entity ? "Edit SLA plan" : "Add SLA plan"} onSubmit={onSubmit} submitting={form.submitting}>
      <Input label="Plan name" placeholder="e.g. Gold SLA" {...form.field("name")} />
      <Input
        label="Response window (hours)"
        type="number"
        min={1}
        max={720}
        hint="New tickets on this plan are due this many hours after they're opened."
        {...form.field("graceHours", { numeric: true })}
      />
      <Textarea label="Notes" rows={3} {...form.field("notes")} />
    </FormModal>
  );
}
