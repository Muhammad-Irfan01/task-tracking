"use client";

import { Building2, Plus, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, ErrorState, FormModal, Input, Modal, PageHeader, RowSkeleton, SearchInput, StatCard, Table, Td, Tr } from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { useZodForm } from "@/hooks/useZodForm";
import { PLAN_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { tenantCreateSchema } from "@/lib/schemas";
import { errorMessage, platformService, type InviteResult } from "@/services";
import type { Tenant } from "@/types";
import { InviteLink } from "./InviteLink";
import { TenantStatusBadge } from "./TenantStatusBadge";

export function TenantsView() {
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{ email: string; invite: InviteResult } | null>(null);
  const [search, setSearch] = useState("");
  const query = useDebounce(search, 200).toLowerCase();

  const fetchTenants = useCallback(
    () =>
      platformService
        .tenants()
        .then(setTenants)
        .catch((e) => setError(errorMessage(e))),
    [],
  );

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  function load() {
    setError(null);
    fetchTenants();
  }

  const filtered = useMemo(
    () => (tenants ?? []).filter((t) => !query || t.name.toLowerCase().includes(query) || t.supportEmail.toLowerCase().includes(query)),
    [tenants, query],
  );
  const totals = useMemo(
    () => ({
      active: (tenants ?? []).filter((t) => t.status === "Active").length,
      agents: (tenants ?? []).reduce((sum, t) => sum + t.agents, 0),
      openTickets: (tenants ?? []).reduce((sum, t) => sum + t.openTickets, 0),
    }),
    [tenants],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organizations"
        description="Each organization is a separate help desk with its own admins, staff, customers and tickets."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New organization
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active organizations" value={tenants ? `${totals.active} / ${tenants.length}` : "—"} icon={Building2} />
        <StatCard label="Active agents" value={tenants ? totals.agents : "—"} icon={Users} accent="emerald" />
        <StatCard label="Open tickets" value={tenants ? totals.openTickets : "—"} icon={Ticket} accent="amber" />
      </div>

      <Card className="p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search organizations by name or email…" />
      </Card>

      <Card>
        {error && <ErrorState message={error} onRetry={load} />}
        {!error && !tenants && (
          <div className="px-4">
            {[0, 1, 2].map((i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )}
        {tenants && tenants.length === 0 && (
          <EmptyState
            icon={Building2}
            title="No organizations yet"
            description="Create your first client organization and invite its administrator."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> New organization
              </Button>
            }
          />
        )}
        {tenants && tenants.length > 0 && (
          <Table columns={["Organization", "Plan", "Seats", "Tickets", "Status", "Created"]}>
            {filtered.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <Link href={`/platform/tenants/${t.id}`} className="font-medium text-ink-900 hover:text-brand-600 dark:text-paper-100">
                    {t.name}
                  </Link>
                  <p className="text-xs text-ink-900/45 dark:text-paper-100/45">{t.supportEmail}</p>
                </Td>
                <Td muted>{t.plan}</Td>
                <Td muted>
                  {t.agents}
                  {t.maxAgents === null ? "" : ` / ${t.maxAgents}`}
                </Td>
                <Td muted>
                  {t.openTickets} open · {t.totalTickets} total
                </Td>
                <Td>
                  <TenantStatusBadge status={t.status} />
                </Td>
                <Td muted>{formatDate(t.createdAt)}</Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <CreateTenantModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(tenant, invite, email) => {
          setTenants((current) => [tenant, ...(current ?? [])]);
          setCreating(false);
          setCreatedInvite({ email, invite });
        }}
      />
      <Modal open={!!createdInvite} onClose={() => setCreatedInvite(null)} title="Organization created" size="md">
        {createdInvite && <InviteLink email={createdInvite.email} invite={createdInvite.invite} />}
      </Modal>
    </div>
  );
}

function CreateTenantModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (tenant: Tenant, invite: InviteResult, adminEmail: string) => void;
}) {
  const initial = {
    name: "",
    supportEmail: "",
    timezone: "UTC (UTC+00:00)",
    plan: "Business",
    maxAgents: Number.NaN,
    adminName: "",
    adminEmail: "",
  };
  const form = useZodForm(tenantCreateSchema, initial);

  const onSubmit = form.handleSubmit(async (input) => {
    const { inviteEmailed, inviteUrl, ...tenant } = await platformService.createTenant(input);
    form.reset(initial);
    onCreated(tenant, { inviteEmailed, inviteUrl }, input.adminEmail);
  });

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="New organization"
      description="Creates an empty help desk with a starter department, SLA plan and help topic."
      onSubmit={onSubmit}
      submitting={form.submitting}
      submitLabel="Create organization"
      size="lg"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Organization name" placeholder="e.g. Acme Corp" {...form.field("name")} />
        <Input label="Support email" type="email" placeholder="support@acme.com" {...form.field("supportEmail")} />
        <Input label="Plan" list="plan-options" {...form.field("plan")} />
        <Input
          label="Seat limit"
          type="number"
          min={1}
          placeholder="Unlimited"
          hint="Maximum active agents. Leave blank for unlimited."
          {...form.field("maxAgents", { numeric: true })}
        />
      </div>
      <Input label="Time zone" list="timezone-options" {...form.field("timezone")} />
      <datalist id="plan-options">
        {PLAN_OPTIONS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <datalist id="timezone-options">
        {TIMEZONE_OPTIONS.map((tz) => (
          <option key={tz} value={tz} />
        ))}
      </datalist>
      <div className="border-t border-ink-900/[0.06] pt-4 dark:border-paper-100/[0.06]">
        <p className="mb-3 text-sm font-medium text-ink-900 dark:text-paper-100">First administrator</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Admin name" autoComplete="off" {...form.field("adminName")} />
          <Input
            label="Admin email"
            type="email"
            autoComplete="off"
            hint="They get an email to set their password."
            {...form.field("adminEmail")}
          />
        </div>
      </div>
    </FormModal>
  );
}
