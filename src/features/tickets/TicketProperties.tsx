"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, PriorityDot, Select } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { confirmDelete } from "@/hooks/useEntityDialog";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/constants";
import type { TicketUpdateInput } from "@/lib/schemas";
import { errorMessage } from "@/services";
import { toast, useDepartmentsStore, useHelpTopicsStore, useStaffStore, useTicketsStore } from "@/store";
import type { Ticket } from "@/types";
import { CategoryFields } from "./CategoryFields";

type Editable = Required<Pick<Ticket, "status" | "priority" | "assignee" | "department" | "topic">> & {
  category: string;
  subcategory: string;
};

const pickEditable = (t: Ticket): Editable => ({
  status: t.status,
  priority: t.priority,
  assignee: t.assignee,
  department: t.department,
  topic: t.topic,
  category: t.category ?? "",
  subcategory: t.subcategory ?? "",
});

const CATEGORY_KEYS = ["department", "category", "subcategory"] as const;

export function TicketProperties({ ticket }: { ticket: Ticket }) {
  const router = useRouter();
  const updateTicket = useTicketsStore((state) => state.updateTicket);
  const deleteTicket = useTicketsStore((state) => state.deleteTicket);
  const staff = useCollection(useStaffStore);
  const departments = useCollection(useDepartmentsStore);
  const topics = useCollection(useHelpTopicsStore);

  // Only the fields the agent touched; everything else tracks the live ticket.
  const [overrides, setOverrides] = useState<Partial<Editable>>({});
  const [saving, setSaving] = useState(false);
  const saved = pickEditable(ticket);
  const draft: Editable = { ...saved, ...overrides };
  const changes = Object.fromEntries(
    Object.entries(overrides).filter(([key, value]) => saved[key as keyof Editable] !== value),
  ) as TicketUpdateInput;
  // The server checks category and sub-category against the department, so they travel together.
  if (CATEGORY_KEYS.some((key) => key in changes)) {
    for (const key of CATEGORY_KEYS) changes[key] = draft[key];
  }
  const dirty = Object.keys(changes).length > 0;

  const update = <K extends keyof Editable>(key: K, value: Editable[K]) => setOverrides((o) => ({ ...o, [key]: value }));

  async function save() {
    setSaving(true);
    try {
      await updateTicket(ticket.id, changes);
      setOverrides({});
      toast.success("Ticket updated");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const deleted = await confirmDelete("ticket", `${ticket.number} · ${ticket.subject}`, () => deleteTicket(ticket.id));
    if (deleted) router.push("/tickets");
  }

  const activeAgents = staff.items.filter((a) => a.active || a.name === ticket.assignee);

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-display font-semibold text-ink-900 dark:text-paper-100">Ticket properties</h2>
      <Select label="Status" value={draft.status} onChange={(e) => update("status", e.target.value as Editable["status"])}>
        {TICKET_STATUSES.map((s) => (
          <option key={s.id}>{s.name}</option>
        ))}
      </Select>
      <Select label="Priority" value={draft.priority} onChange={(e) => update("priority", e.target.value as Editable["priority"])}>
        {TICKET_PRIORITIES.map((p) => (
          <option key={p.id}>{p.name}</option>
        ))}
      </Select>
      <Select label="Assigned to" value={draft.assignee} onChange={(e) => update("assignee", e.target.value)}>
        {activeAgents.length === 0 && <option>{draft.assignee}</option>}
        {activeAgents.map((a) => (
          <option key={a.id} value={a.name}>
            {a.name}
            {a.onVacation ? " (on vacation)" : ""} · {a.openTickets} open
          </option>
        ))}
      </Select>
      <Select
        label="Department"
        value={draft.department}
        onChange={(e) => setOverrides((o) => ({ ...o, department: e.target.value, category: "", subcategory: "" }))}
      >
        {departments.items.length === 0 && <option>{draft.department}</option>}
        {departments.items.map((d) => (
          <option key={d.id}>{d.name}</option>
        ))}
      </Select>
      <Select label="Help topic" value={draft.topic} onChange={(e) => update("topic", e.target.value)}>
        {topics.items.length === 0 && <option>{draft.topic}</option>}
        {topics.items.map((t) => (
          <option key={t.id}>{t.name}</option>
        ))}
      </Select>
      <CategoryFields
        categories={departments.items.find((d) => d.name === draft.department)?.categories ?? []}
        category={draft.category}
        subcategory={draft.subcategory}
        onChange={(category, subcategory) => setOverrides((o) => ({ ...o, category, subcategory }))}
      />
      <div className="flex items-center gap-2 pt-1 text-sm">
        <PriorityDot priority={draft.priority} pulse />
        <span className="text-ink-900/60 dark:text-paper-100/60">Current urgency level</span>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={save} loading={saving} disabled={!dirty}>
          Save changes
        </Button>
        {dirty && (
          <Button variant="secondary" onClick={() => setOverrides({})}>
            Undo
          </Button>
        )}
      </div>
      <button
        onClick={remove}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/5"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete ticket
      </button>
    </Card>
  );
}
