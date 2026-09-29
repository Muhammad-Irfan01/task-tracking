"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackLink, Button, Card, EmptyState, Input, LinkButton, Select, Skeleton, Textarea } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import { TICKET_PRIORITIES } from "@/lib/constants";
import { portalTicketSchema, type PortalTicketInput } from "@/lib/schemas";
import { errorMessage, portalService } from "@/services";
import { toast } from "@/store";
import type { PortalOptions } from "@/types";

const PRIORITY_HINTS: Record<string, string> = {
  Low: "Whenever there's time",
  Normal: "Needed in the usual time",
  High: "Blocking part of my work",
  Emergency: "Blocking my work completely",
};

export function NewTicketView() {
  const router = useRouter();
  const [options, setOptions] = useState<PortalOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const form = useZodForm(portalTicketSchema, {
    subject: "",
    department: "",
    topic: "",
    priority: "Normal",
    message: "",
  } satisfies PortalTicketInput);
  const { values, set } = form;

  useEffect(() => {
    portalService
      .options()
      .then((next) => {
        setOptions(next);
        const first = next.departments[0];
        if (first) {
          set("department", first.name);
          set("topic", first.topics[0] ?? "");
        }
      })
      .catch((e) => setLoadError(errorMessage(e)));
  }, [set]);

  const topics = options?.departments.find((d) => d.name === values.department)?.topics ?? [];

  function chooseDepartment(name: string) {
    set("department", name);
    set("topic", options?.departments.find((d) => d.name === name)?.topics[0] ?? "");
  }

  const onSubmit = form.handleSubmit(async (input) => {
    const ticket = await portalService.create(input);
    toast.success(`Ticket ${ticket.number} sent to ${ticket.department}`);
    router.push(`/portal/tickets/${ticket.id}`);
  });

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <BackLink href="/portal" label="Back to my tickets" className="mb-2" />
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-paper-100">New ticket</h1>
        <p className="mt-1 text-sm text-ink-900/50 dark:text-paper-100/50">
          Pick the department that should handle it. You&apos;ll be notified here when they reply.
        </p>
      </div>

      <Card className="p-6">
        {loadError && <p className="text-sm text-rose-500">{loadError}</p>}
        {!options && !loadError && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {options && options.departments.length === 0 && (
          <EmptyState
            title="No departments are taking requests yet"
            description="Ask your administrator to set up departments and help topics."
            action={
              <LinkButton href="/portal" variant="secondary">
                Back
              </LinkButton>
            }
          />
        )}
        {options && options.departments.length > 0 && (
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Department" {...form.field("department")} onChange={(e) => chooseDepartment(e.target.value)}>
                {options.departments.map((d) => (
                  <option key={d.name}>{d.name}</option>
                ))}
              </Select>
              <Select label="Topic" {...form.field("topic")}>
                {topics.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
            <Input label="Subject" placeholder="Short summary, e.g. “Laptop won't connect to VPN”" {...form.field("subject")} />
            <Select label="Priority" {...form.field("priority")}>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} — {PRIORITY_HINTS[p.name]}
                </option>
              ))}
            </Select>
            <Textarea
              label="Details"
              rows={7}
              placeholder="What do you need, and by when? Include anything that helps (steps, error messages, location…). You can attach files after creating the ticket."
              {...form.field("message")}
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <LinkButton href="/portal" variant="secondary">
                Cancel
              </LinkButton>
              <Button type="submit" loading={form.submitting}>
                <Send className="h-4 w-4" /> Submit ticket
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
