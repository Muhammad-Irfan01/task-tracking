"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BackLink, Breadcrumb, Button, Card, Input, LinkButton, Select, Textarea } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useZodForm } from "@/hooks/useZodForm";
import { TICKET_PRIORITIES } from "@/lib/constants";
import { ticketCreateSchema, type TicketCreateInput } from "@/lib/schemas";
import { toast, useCustomersStore, useDepartmentsStore, useHelpTopicsStore, useTicketsStore } from "@/store";

interface TicketCreateViewProps {
  /** Pre-fills the requester when opened from a customer profile. */
  customerId?: string;
}

export function TicketCreateView({ customerId }: TicketCreateViewProps) {
  const router = useRouter();
  const createTicket = useTicketsStore((state) => state.createTicket);
  const departments = useCollection(useDepartmentsStore);
  const topics = useCollection(useHelpTopicsStore);
  const customers = useCollection(useCustomersStore);

  const form = useZodForm(ticketCreateSchema, {
    subject: "",
    customerName: "",
    customerEmail: "",
    department: "",
    topic: "",
    priority: "Normal",
    message: "",
  } satisfies TicketCreateInput);
  const { values, set } = form;

  // Fill defaults once the option lists (and optional customer) have loaded.
  useEffect(() => {
    const topic = topics.items[0];
    if (!values.topic && topic) {
      set("topic", topic.name);
      set("department", topic.dept);
    }
  }, [topics.items, values.topic, set]);

  useEffect(() => {
    const customer = customers.items.find((c) => String(c.id) === customerId);
    if (customer && !values.customerEmail) {
      set("customerName", customer.name);
      set("customerEmail", customer.email);
    }
  }, [customers.items, customerId, values.customerEmail, set]);

  const onSubmit = form.handleSubmit(async (input) => {
    const ticket = await createTicket(input);
    toast.success(`Ticket ${ticket.number} created and assigned to ${ticket.assignee}`);
    router.push(`/tickets/${ticket.id}`);
  });

  function onTopicChange(name: string) {
    set("topic", name);
    const topic = topics.items.find((t) => t.name === name);
    if (topic) set("department", topic.dept);
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <BackLink href="/tickets" label="Back to tickets" className="mb-2" />
        <Breadcrumb items={[{ label: "Tickets", href: "/tickets" }, { label: "New Ticket" }]} />
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900 dark:text-paper-100">Create a new ticket</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Input label="Subject" placeholder="Brief summary of the issue" {...form.field("subject")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Customer name" placeholder="Jane Doe" list="customer-names" {...form.field("customerName")} />
            <Input
              label="Customer email"
              type="email"
              placeholder="jane@company.com"
              hint="Existing customers are matched by email; new emails create a customer."
              {...form.field("customerEmail")}
              onChange={(e) => {
                form.field("customerEmail").onChange(e);
                const match = customers.items.find((c) => c.email === e.target.value.trim().toLowerCase());
                if (match) set("customerName", match.name);
              }}
            />
            <datalist id="customer-names">
              {customers.items.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Help topic" {...form.field("topic")} onChange={(e) => onTopicChange(e.target.value)}>
              {topics.items.map((t) => (
                <option key={t.id}>{t.name}</option>
              ))}
            </Select>
            <Select label="Department" {...form.field("department")}>
              {departments.items.map((d) => (
                <option key={d.id}>{d.name}</option>
              ))}
            </Select>
            <Select label="Priority" {...form.field("priority")}>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <Textarea label="Describe the issue" rows={6} placeholder="Provide as much detail as possible…" {...form.field("message")} />
          <div className="flex items-center justify-end gap-3 pt-2">
            <LinkButton href="/tickets" variant="secondary">
              Cancel
            </LinkButton>
            <Button type="submit" loading={form.submitting}>
              Create ticket
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
