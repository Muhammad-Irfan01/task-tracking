"use client";

import { FormModal, Input, Select, Switch } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useZodForm } from "@/hooks/useZodForm";
import { departmentSchema } from "@/lib/schemas";
import { toast, useDepartmentsStore, useStaffStore } from "@/store";
import type { Department } from "@/types";
import type { EntityFormProps } from "./types";

export function DepartmentFormModal({ open, entity, onClose }: EntityFormProps<Department>) {
  const { create, update } = useDepartmentsStore();
  const staff = useCollection(useStaffStore);
  const form = useZodForm(departmentSchema, {
    name: entity?.name ?? "",
    manager: entity?.manager ?? "",
    isPublic: entity?.isPublic ?? true,
  });

  const onSubmit = form.handleSubmit(async (input) => {
    if (entity) await update(entity.id, input);
    else await create(input);
    toast.success(entity ? "Department updated" : `${input.name} created`);
    onClose();
  });

  return (
    <FormModal open={open} onClose={onClose} title={entity ? "Edit department" : "Add department"} onSubmit={onSubmit} submitting={form.submitting}>
      <Input label="Name" placeholder="e.g. Partner Success" {...form.field("name")} />
      <Select label="Manager" {...form.field("manager")}>
        <option value="">Choose a manager…</option>
        {staff.items
          .filter((a) => a.active)
          .map((a) => (
            <option key={a.id}>{a.name}</option>
          ))}
      </Select>
      <Switch
        label="Public"
        description="Customers can pick this department when opening tickets"
        checked={form.values.isPublic}
        onChange={(v) => form.set("isPublic", v)}
      />
    </FormModal>
  );
}
