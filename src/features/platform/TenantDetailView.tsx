"use client";

import { Ban, CheckCircle2, Mail, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BackLink, Button, Card, ErrorState, FormModal, Input, Modal, PageHeader, Skeleton, StatCard, Table, Td, Tr } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import { PLAN_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/constants";
import { tenantAdminSchema, tenantSchema } from "@/lib/schemas";
import { errorMessage, platformService, type InviteResult } from "@/services";
import { confirm, toast } from "@/store";
import type { TenantDetail } from "@/types";
import { InviteLink } from "./InviteLink";
import { TenantStatusBadge } from "./TenantStatusBadge";

export function TenantDetailView({ id }: { id: string }) {
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [invite, setInvite] = useState<{ email: string; invite: InviteResult } | null>(null);

  const fetchTenant = useCallback(
    () =>
      platformService
        .tenant(id)
        .then(setTenant)
        .catch((e) => setError(errorMessage(e))),
    [id],
  );

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  function load() {
    setError(null);
    fetchTenant();
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={load} />
      </Card>
    );
  }
  if (!tenant) return <Skeleton className="h-96 w-full rounded-2xl" />;

  const suspended = tenant.status === "Suspended";

  async function toggleStatus() {
    const next = suspended ? "Active" : "Suspended";
    const ok = await confirm({
      title: suspended ? `Reactivate ${tenant!.name}?` : `Suspend ${tenant!.name}?`,
      description: suspended
        ? "Its admins and staff can sign in again."
        : "Everyone in this organization is signed out and can't sign in until you reactivate it. No data is deleted.",
      confirmLabel: suspended ? "Reactivate" : "Suspend",
      tone: suspended ? "primary" : "danger",
    });
    if (!ok) return;
    try {
      setTenant(await platformService.updateTenant(tenant!.id, { status: next }));
      toast.success(suspended ? "Organization reactivated" : "Organization suspended");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function resend(staffId: number, email: string) {
    try {
      setInvite({ email, invite: await platformService.resendInvite(tenant!.id, staffId) });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="space-y-5">
      <BackLink href="/platform" label="All organizations" />
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {tenant.name} <TenantStatusBadge status={tenant.status} />
          </span>
        }
        description={`Created ${new Date(tenant.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`}
        actions={
          <Button variant={suspended ? "primary" : "secondary"} onClick={toggleStatus}>
            {suspended ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            {suspended ? "Reactivate" : "Suspend"}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active agents" value={`${tenant.agents}${tenant.maxAgents === null ? "" : ` / ${tenant.maxAgents}`}`} />
        <StatCard label="Administrators" value={tenant.admins} accent="emerald" />
        <StatCard label="Open tickets" value={`${tenant.openTickets} of ${tenant.totalTickets}`} accent="amber" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-display font-semibold text-ink-900 dark:text-paper-100">Subscription & details</h2>
          <TenantForm key={`${tenant.id}-${tenant.name}-${tenant.plan}-${tenant.maxAgents}`} tenant={tenant} onSaved={setTenant} />
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between gap-3 p-5 pb-3">
            <h2 className="font-display font-semibold text-ink-900 dark:text-paper-100">People</h2>
            <Button size="sm" onClick={() => setAddingAdmin(true)}>
              <Plus className="h-4 w-4" /> Add admin
            </Button>
          </div>
          <p className="px-5 pb-3 text-xs text-ink-900/50 dark:text-paper-100/50">
            Admins add their own staff from Agents inside their desk.
          </p>
          <Table columns={["Name", "Role", "Status", ""]}>
            {tenant.members.map((m) => (
              <Tr key={m.id}>
                <Td>
                  <p className="font-medium text-ink-900 dark:text-paper-100">{m.name}</p>
                  <p className="text-xs text-ink-900/45 dark:text-paper-100/45">{m.email}</p>
                </Td>
                <Td muted>
                  <span className="inline-flex items-center gap-1">
                    {m.isAdmin && <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />}
                    {m.isAdmin ? "Admin" : m.role}
                  </span>
                </Td>
                <Td muted>{!m.active ? "Deactivated" : m.hasPassword ? "Active" : "Invited"}</Td>
                <Td className="text-right">
                  {!m.hasPassword && m.active && (
                    <Button variant="ghost" size="sm" onClick={() => resend(m.id, m.email)}>
                      <Mail className="h-3.5 w-3.5" /> Resend invite
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
          {tenant.members.length === 0 && <p className="p-5 text-sm text-ink-900/50 dark:text-paper-100/50">No people yet.</p>}
        </Card>
      </div>

      <Card className="border border-rose-500/20 p-5">
        <h2 className="font-display font-semibold text-rose-600 dark:text-rose-400">Danger zone</h2>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-900/60 dark:text-paper-100/60">
            Permanently delete this organization with all its agents, customers, tickets and files. This can&apos;t be undone.
          </p>
          <Button variant="danger" onClick={() => setDeleting(true)}>
            <Trash2 className="h-4 w-4" /> Delete organization
          </Button>
        </div>
      </Card>

      <AddAdminModal
        tenantId={tenant.id}
        open={addingAdmin}
        onClose={() => setAddingAdmin(false)}
        onAdded={(email, result) => {
          setAddingAdmin(false);
          setInvite({ email, invite: result });
          load();
        }}
      />
      <DeleteTenantModal tenant={tenant} open={deleting} onClose={() => setDeleting(false)} />
      <Modal open={!!invite} onClose={() => setInvite(null)} title="Invite sent">
        {invite && <InviteLink email={invite.email} invite={invite.invite} />}
      </Modal>
    </div>
  );
}

function TenantForm({ tenant, onSaved }: { tenant: TenantDetail; onSaved: (t: TenantDetail) => void }) {
  const form = useZodForm(tenantSchema, {
    name: tenant.name,
    supportEmail: tenant.supportEmail,
    timezone: tenant.timezone,
    plan: tenant.plan,
    maxAgents: tenant.maxAgents ?? Number.NaN,
    status: tenant.status,
  });

  // Status has its own Suspend / Reactivate button, so the form never sends it.
  const onSubmit = form.handleSubmit(async (input) => {
    const { name, supportEmail, timezone, plan, maxAgents } = input;
    onSaved(await platformService.updateTenant(tenant.id, { name, supportEmail, timezone, plan, maxAgents }));
    toast.success("Organization saved");
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Input label="Organization name" {...form.field("name")} />
      <Input label="Support email" type="email" {...form.field("supportEmail")} />
      <Input label="Plan" list="plan-options" {...form.field("plan")} />
      <Input
        label="Seat limit"
        type="number"
        min={1}
        placeholder="Unlimited"
        hint="Maximum active agents. Leave blank for unlimited."
        {...form.field("maxAgents", { numeric: true })}
      />
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
      <div className="flex justify-end">
        <Button type="submit" loading={form.submitting}>
          Save
        </Button>
      </div>
    </form>
  );
}

function AddAdminModal({
  tenantId,
  open,
  onClose,
  onAdded,
}: {
  tenantId: number;
  open: boolean;
  onClose: () => void;
  onAdded: (email: string, invite: InviteResult) => void;
}) {
  const form = useZodForm(tenantAdminSchema, { name: "", email: "" });

  const onSubmit = form.handleSubmit(async (input) => {
    const { inviteEmailed, inviteUrl } = await platformService.addAdmin(tenantId, input);
    form.reset({ name: "", email: "" });
    onAdded(input.email, { inviteEmailed, inviteUrl });
  });

  return (
    <FormModal open={open} onClose={onClose} title="Add administrator" onSubmit={onSubmit} submitting={form.submitting} submitLabel="Add & invite">
      <Input label="Full name" autoComplete="off" {...form.field("name")} />
      <Input label="Email" type="email" autoComplete="off" hint="They get an email to set their password." {...form.field("email")} />
    </FormModal>
  );
}

function DeleteTenantModal({ tenant, open, onClose }: { tenant: TenantDetail; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const matches = typed.trim().toLowerCase() === tenant.name.toLowerCase();

  async function remove() {
    setBusy(true);
    try {
      await platformService.deleteTenant(tenant.id, typed);
      toast.success(`${tenant.name} deleted`);
      router.replace("/platform");
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Delete ${tenant.name}?`}
      description={`${tenant.members.length} people and ${tenant.totalTickets} tickets will be deleted for good.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={remove} disabled={!matches} loading={busy}>
            Delete forever
          </Button>
        </>
      }
    >
      <Input label={`Type “${tenant.name}” to confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
    </Modal>
  );
}
