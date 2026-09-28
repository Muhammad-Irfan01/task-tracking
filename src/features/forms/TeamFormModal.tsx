"use client";

import { Avatar, FormModal, Input, Select, Textarea } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useZodForm } from "@/hooks/useZodForm";
import { teamSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { toast, useStaffStore, useTeamsStore } from "@/store";
import type { Team } from "@/types";
import type { EntityFormProps } from "./types";

export function TeamFormModal({ open, entity, onClose }: EntityFormProps<Team>) {
  const { create, update } = useTeamsStore();
  const staff = useCollection(useStaffStore);
  const form = useZodForm(teamSchema, {
    name: entity?.name ?? "",
    lead: entity?.lead ?? "",
    memberIds: entity?.memberIds ?? [],
    notes: entity?.notes ?? "",
  });
  const members = form.values.memberIds;

  function toggle(id: number) {
    form.set("memberIds", members.includes(id) ? members.filter((m) => m !== id) : [...members, id]);
  }

  function setLead(name: string) {
    form.set("lead", name);
    const agent = staff.items.find((a) => a.name === name);
    if (agent && !members.includes(agent.id)) form.set("memberIds", [...members, agent.id]);
  }

  const onSubmit = form.handleSubmit(async (input) => {
    if (entity) await update(entity.id, input);
    else await create(input);
    toast.success(entity ? "Team updated" : `${input.name} created`);
    onClose();
  });

  return (
    <FormModal open={open} onClose={onClose} size="lg" title={entity ? "Edit team" : "Add team"} onSubmit={onSubmit} submitting={form.submitting}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Team name" {...form.field("name")} />
        <Select label="Team lead" {...form.field("lead")} onChange={(e) => setLead(e.target.value)}>
          <option value="">Choose a lead…</option>
          {staff.items.map((a) => (
            <option key={a.id}>{a.name}</option>
          ))}
        </Select>
      </div>
      <Textarea label="Notes" rows={2} placeholder="What does this team handle?" {...form.field("notes")} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink-700 dark:text-paper-100/80">
          Members <span className="font-normal text-ink-900/40 dark:text-paper-100/40">({members.length} selected)</span>
        </legend>
        <div className="grid max-h-56 gap-1.5 overflow-y-auto sm:grid-cols-2">
          {staff.items.map((agent) => {
            const checked = members.includes(agent.id);
            return (
              <label
                key={agent.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                  checked
                    ? "border-brand-500 bg-brand-500/5"
                    : "border-ink-900/10 hover:bg-ink-900/[0.02] dark:border-paper-100/10 dark:hover:bg-paper-100/[0.03]",
                )}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(agent.id)} className="accent-brand-500" />
                <Avatar name={agent.name} color={agent.avatarColor} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-ink-900 dark:text-paper-100">{agent.name}</span>
                  <span className="block truncate text-xs text-ink-900/45 dark:text-paper-100/45">{agent.dept}</span>
                </span>
              </label>
            );
          })}
        </div>
        {form.errors.memberIds && <p className="mt-1.5 text-xs text-rose-500">{form.errors.memberIds}</p>}
      </fieldset>
    </FormModal>
  );
}
