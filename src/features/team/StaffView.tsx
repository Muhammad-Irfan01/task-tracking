"use client";

import { PlaneTakeoff, Plus, ShieldCheck, UserCog } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { useCurrentUser } from "@/components/providers/SessionProvider";
import { Avatar, Badge, Button, Card, CardGridSkeleton, EmptyState, ErrorState, PageHeader, RowActions, SearchInput, Switch } from "@/components/ui";
import { AgentFormModal } from "@/features/forms/AgentFormModal";
import { useCollection } from "@/hooks/useCollection";
import { useDebounce } from "@/hooks/useDebounce";
import { confirmDelete, useEntityDialog } from "@/hooks/useEntityDialog";
import { errorMessage } from "@/services";
import { toast, useStaffStore } from "@/store";
import type { Agent } from "@/types";

export function StaffView({ initialQuery = "" }: { initialQuery?: string }) {
  const user = useCurrentUser();
  const { items, isLoading, status, error, refetch } = useCollection(useStaffStore);
  const { update, remove } = useStaffStore();
  const dialog = useEntityDialog<Agent>();
  const [search, setSearch] = useState(initialQuery);
  const query = useDebounce(search, 250).toLowerCase();
  const filtered = useMemo(
    () =>
      items.filter(
        (a) => !query || a.name.toLowerCase().includes(query) || a.dept.toLowerCase().includes(query) || a.email.toLowerCase().includes(query),
      ),
    [items, query],
  );

  async function toggleVacation(agent: Agent) {
    try {
      await update(agent.id, { onVacation: !agent.onVacation });
      toast.success(agent.onVacation ? `${agent.name} is back from vacation` : `${agent.name} is on vacation — new tickets will skip them`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const canManage = (agent: Agent) => user.isAdmin || agent.id === user.id;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agents"
        description={isLoading ? "Loading agents…" : `${filtered.length} staff accounts across all departments`}
        actions={
          user.isAdmin && (
            <Button onClick={dialog.openCreate}>
              <Plus className="h-4 w-4" /> Add Agent
            </Button>
          )
        }
      />
      <Card className="p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search agents by name, email, or department…" />
      </Card>

      {status === "error" && (
        <Card>
          <ErrorState message={error} onRetry={refetch} />
        </Card>
      )}
      {isLoading && <CardGridSkeleton />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((agent, i) => (
          <FadeIn key={agent.id} index={i}>
            <Card className="h-full p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={agent.name} color={agent.avatarColor} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium text-ink-900 dark:text-paper-100">
                      <span className="truncate">{agent.name}</span>
                      {agent.isAdmin && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-label="Administrator" />}
                      {agent.id === user.id && <span className="text-[10px] font-semibold uppercase text-brand-500">You</span>}
                    </p>
                    <p className="text-xs text-ink-900/45 dark:text-paper-100/45">{agent.role}</p>
                  </div>
                </div>
                {canManage(agent) && (
                  <RowActions
                    label={agent.name}
                    onEdit={() => dialog.openEdit(agent)}
                    onDelete={user.isAdmin && agent.id !== user.id ? () => confirmDelete("agent", agent.name, () => remove(agent.id)) : undefined}
                  />
                )}
              </div>
              <a href={`mailto:${agent.email}`} className="mt-3 block truncate text-xs text-ink-900/45 hover:text-brand-500 dark:text-paper-100/45">
                {agent.email}
              </a>
              <div className="mt-4 flex items-center justify-between border-t border-ink-900/[0.06] pt-4 text-sm dark:border-paper-100/[0.06]">
                <span className="text-ink-900/50 dark:text-paper-100/50">{agent.dept}</span>
                <Badge status={agent.active ? "Resolved" : "Closed"}>{agent.active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink-900/45 dark:text-paper-100/45">
                <Link href={`/tickets?assignee=${encodeURIComponent(agent.name)}`} className="hover:text-brand-500">
                  Open tickets <span className="font-semibold text-ink-900 dark:text-paper-100">{agent.openTickets}</span>
                </Link>
                <span className="text-right">
                  Resolved (30d) <span className="font-semibold text-ink-900 dark:text-paper-100">{agent.resolvedThisMonth}</span>
                </span>
              </div>
              {agent.active && canManage(agent) && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-ink-900/[0.02] px-3 py-2 dark:bg-paper-100/[0.03]">
                  <span className="flex items-center gap-1.5 text-xs text-ink-900/60 dark:text-paper-100/60">
                    <PlaneTakeoff className={agent.onVacation ? "h-3.5 w-3.5 text-amber-500" : "h-3.5 w-3.5"} /> On vacation
                  </span>
                  <Switch checked={agent.onVacation} onChange={() => toggleVacation(agent)} />
                </div>
              )}
            </Card>
          </FadeIn>
        ))}
      </div>

      {!isLoading && status !== "error" && filtered.length === 0 && (
        <Card>
          <EmptyState icon={UserCog} title="No agents found" description="Try a different search term." />
        </Card>
      )}
      <AgentFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
    </div>
  );
}
