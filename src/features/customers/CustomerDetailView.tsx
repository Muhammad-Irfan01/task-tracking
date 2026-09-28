"use client";

import { Building2, Lock, LockOpen, Mail, Pencil, Phone, Plus, Trash2, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import {
  Avatar,
  BackLink,
  Badge,
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  RowSkeleton,
  Skeleton,
} from "@/components/ui";
import { CustomerFormModal } from "@/features/forms/CustomerFormModal";
import { useCollection } from "@/hooks/useCollection";
import { confirmDelete, useEntityDialog } from "@/hooks/useEntityDialog";
import { formatDate, timeAgo } from "@/lib/utils";
import { errorMessage } from "@/services";
import { toast, useCustomersStore, useTicketsStore } from "@/store";
import type { Customer } from "@/types";
import { CUSTOMER_BADGE_TONE } from "./customer-status";

const MUTED_ICON = "h-4 w-4 shrink-0 text-ink-900/35 dark:text-paper-100/35";

export function CustomerDetailView({ id }: { id: string }) {
  const router = useRouter();
  const customers = useCollection(useCustomersStore);
  const tickets = useCollection(useTicketsStore);
  const { update, remove } = useCustomersStore();
  const dialog = useEntityDialog<Customer>();
  const customer = customers.items.find((c) => String(c.id) === id);
  const history = useMemo(
    () => (customer ? tickets.items.filter((t) => t.customerEmail === customer.email) : []),
    [customer, tickets.items],
  );

  if (customers.status === "error") {
    return (
      <Card>
        <ErrorState message={customers.error} onRetry={customers.refetch} />
      </Card>
    );
  }

  if (!customers.isLoading && !customer) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={UserX}
          title="Customer not found"
          action={
            <LinkButton href="/customers" variant="secondary">
              Back to customers
            </LinkButton>
          }
        />
      </Card>
    );
  }

  async function toggleLock() {
    if (!customer) return;
    const next = customer.status === "Locked" ? "Active" : "Locked";
    try {
      await update(customer.id, { status: next });
      toast.success(next === "Locked" ? `${customer.name}'s account is locked` : `${customer.name}'s account is unlocked`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function onDelete() {
    if (!customer) return;
    if (await confirmDelete("customer", customer.name, () => remove(customer.id))) router.push("/customers");
  }

  return (
    <div className="space-y-5">
      <div>
        <BackLink href="/customers" label="Back to customers" className="mb-2" />
        <Breadcrumb items={[{ label: "Customers", href: "/customers" }, { label: customer?.name ?? "…" }]} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 text-center lg:col-span-1">
          {customer ? (
            <FadeIn>
              <Avatar name={customer.name} size="lg" color="bg-brand-400" className="mx-auto" />
              <h1 className="mt-3 font-display text-lg font-semibold text-ink-900 dark:text-paper-100">{customer.name}</h1>
              <div className="mt-1">
                <Badge status={CUSTOMER_BADGE_TONE[customer.status]}>{customer.status}</Badge>
              </div>
              <div className="mt-5 space-y-2.5 text-left text-sm">
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-ink-700 hover:text-brand-500 dark:text-paper-100/70">
                  <Mail className={MUTED_ICON} /> <span className="truncate">{customer.email}</span>
                </a>
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-ink-700 hover:text-brand-500 dark:text-paper-100/70">
                    <Phone className={MUTED_ICON} /> {customer.phone}
                  </a>
                )}
                <Link
                  href={`/customers?org=${encodeURIComponent(customer.organization)}`}
                  className="flex items-center gap-2 text-ink-700 hover:text-brand-500 dark:text-paper-100/70"
                >
                  <Building2 className={MUTED_ICON} /> {customer.organization}
                </Link>
              </div>
              <p className="mt-4 text-xs text-ink-900/40 dark:text-paper-100/40">Customer since {formatDate(customer.joined)}</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={() => customer && dialog.openEdit(customer)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="secondary" size="sm" onClick={toggleLock}>
                  {customer.status === "Locked" ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {customer.status === "Locked" ? "Unlock" : "Lock"}
                </Button>
              </div>
              <button onClick={onDelete} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600">
                <Trash2 className="h-3.5 w-3.5" /> Delete customer
              </button>
            </FadeIn>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink-900 dark:text-paper-100">
              Ticket history {customer && <span className="text-sm font-normal text-ink-900/40 dark:text-paper-100/40">· {history.length}</span>}
            </h2>
            {customer && (
              <LinkButton href={`/tickets/new?customer=${customer.id}`} size="sm">
                <Plus className="h-3.5 w-3.5" /> New ticket
              </LinkButton>
            )}
          </div>
          {tickets.isLoading && Array.from({ length: 3 }, (_, i) => <RowSkeleton key={i} />)}
          {!tickets.isLoading && history.length === 0 && (
            <p className="text-sm text-ink-900/50 dark:text-paper-100/50">No tickets on file for this customer yet.</p>
          )}
          <div className="divide-y divide-ink-900/[0.06] dark:divide-paper-100/[0.06]">
            {history.map((ticket, i) => (
              <FadeIn key={ticket.id} index={Math.min(i, 10)}>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-ink-900/[0.02] dark:hover:bg-paper-100/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900 dark:text-paper-100">{ticket.subject}</p>
                    <p className="font-mono text-xs text-ink-900/40 dark:text-paper-100/40">{ticket.number}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge status={ticket.status} />
                    <span className="hidden text-xs text-ink-900/40 sm:inline dark:text-paper-100/40">{timeAgo(ticket.updated)}</span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </Card>
      </div>

      <CustomerFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
    </div>
  );
}
