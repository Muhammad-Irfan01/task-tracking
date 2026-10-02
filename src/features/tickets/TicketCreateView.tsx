"use client";

import { Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BackLink, Breadcrumb, Button, Card, Input, LinkButton, Select, Textarea } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useZodForm } from "@/hooks/useZodForm";
import { TICKET_PRIORITIES } from "@/lib/constants";
import { ATTACHMENT_LIMITS, ticketCreateSchema, type AttachmentLimits, type TicketCreateInput } from "@/lib/schemas";
import { errorMessage, ticketsService } from "@/services";
import { toast, useCustomersStore, useDepartmentsStore, useHelpTopicsStore, useTicketsStore } from "@/store";
import { CategoryFields, categoryErrors } from "./CategoryFields";
import { SelectedFiles, useAttachmentSelection } from "./conversation";

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
  const fileInput = useRef<HTMLInputElement>(null);
  const [limits, setLimits] = useState<AttachmentLimits>(ATTACHMENT_LIMITS.database);
  const attachments = useAttachmentSelection(limits);

  useEffect(() => {
    // Until this loads, the stricter database limits apply.
    ticketsService.newTicketAttachmentLimits().then(setLimits).catch(() => {});
  }, []);

  const form = useZodForm(ticketCreateSchema, {
    subject: "",
    customerName: "",
    customerEmail: "",
    department: "",
    topic: "",
    category: "",
    subcategory: "",
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

  const categories = departments.items.find((d) => d.name === values.department)?.categories ?? [];
  // The department's own help topics; all of them if none route to it.
  const departmentTopics = topics.items.filter((t) => t.dept === values.department);
  const topicOptions = departmentTopics.length ? departmentTopics : topics.items;

  const submit = form.handleSubmit(async (input) => {
    const ticket = await createTicket(input);
    if (attachments.files.length) {
      try {
        await ticketsService.attachToNewTicket(ticket.id, attachments.files, limits.storage);
      } catch (e) {
        // The ticket exists either way; the files can still go in a reply.
        toast.error(`Ticket ${ticket.number} was created, but the files weren't attached (${errorMessage(e)}). Add them in a reply.`);
        router.push(`/tickets/${ticket.id}`);
        return;
      }
    }
    toast.success(`Ticket ${ticket.number} created and assigned to ${ticket.assignee}`);
    router.push(`/tickets/${ticket.id}`);
  });

  function onSubmit(event: FormEvent) {
    const missing = categoryErrors(categories, values.category ?? "", values.subcategory ?? "");
    if (!missing) return submit(event);
    event.preventDefault();
    form.setErrors(missing);
  }

  function onDepartmentChange(name: string) {
    set("department", name);
    const topic = topics.items.find((t) => t.dept === name);
    if (topic) set("topic", topic.name);
    onCategoryChange("", "");
  }

  function onCategoryChange(category: string, subcategory: string) {
    set("category", category);
    set("subcategory", subcategory);
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Department" {...form.field("department")} onChange={(e) => onDepartmentChange(e.target.value)}>
              {departments.items.map((d) => (
                <option key={d.id}>{d.name}</option>
              ))}
            </Select>
            <Select label="Help topic" {...form.field("topic")}>
              {topicOptions.map((t) => (
                <option key={t.id}>{t.name}</option>
              ))}
            </Select>
            <CategoryFields
              categories={categories}
              category={values.category ?? ""}
              subcategory={values.subcategory ?? ""}
              onChange={onCategoryChange}
              errors={form.errors}
            />
            <Select label="Priority" {...form.field("priority")}>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} — {p.description}
                </option>
              ))}
            </Select>
          </div>
          <Textarea label="Describe the issue" rows={6} placeholder="Provide as much detail as possible…" {...form.field("message")} />
          <div>
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) attachments.addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-1.5 text-sm text-ink-900/50 hover:text-brand-500 dark:text-paper-100/50"
            >
              <Paperclip className="h-4 w-4" /> Attach files
              <span className="text-xs text-ink-900/35 dark:text-paper-100/35">
                (screenshots, documents — up to {limits.maxFiles} files, {limits.maxTotalBytes / 1024 / 1024} MB in total)
              </span>
            </button>
            <SelectedFiles files={attachments.files} onRemove={attachments.remove} />
          </div>
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
