"use client";

import { FormModal, Input, Select, Switch, Textarea } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useZodForm } from "@/hooks/useZodForm";
import { cannedResponseSchema } from "@/lib/schemas";
import { toast, useCannedResponsesStore, useDepartmentsStore } from "@/store";
import type { CannedResponse } from "@/types";
import type { EntityFormProps } from "./types";

export function CannedResponseFormModal({ open, entity, onClose }: EntityFormProps<CannedResponse>) {
  const { create, update } = useCannedResponsesStore();
  const departments = useCollection(useDepartmentsStore);
  const form = useZodForm(cannedResponseSchema, {
    title: entity?.title ?? "",
    dept: entity?.dept ?? "",
    enabled: entity?.enabled ?? true,
    body: entity?.body ?? "",
  });

  const onSubmit = form.handleSubmit(async (input) => {
    if (entity) await update(entity.id, input);
    else await create(input);
    toast.success(entity ? "Response updated" : `${input.title} created`);
    onClose();
  });

  return (
    <FormModal open={open} onClose={onClose} size="lg" title={entity ? "Edit canned response" : "New canned response"} onSubmit={onSubmit} submitting={form.submitting}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Title" {...form.field("title")} />
        <Select label="Department" {...form.field("dept")}>
          <option value="">Choose a department…</option>
          {departments.items.map((d) => (
            <option key={d.id}>{d.name}</option>
          ))}
        </Select>
      </div>
      <Textarea label="Response text" rows={6} {...form.field("body")} />
      <Switch
        label="Enabled"
        description="Enabled responses appear in the ticket reply composer"
        checked={form.values.enabled}
        onChange={(v) => form.set("enabled", v)}
      />
    </FormModal>
  );
}
