"use client";

import { Plus, UsersRound } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Avatar, Button, Card, CardGridSkeleton, ErrorState, PageHeader, RowActions } from "@/components/ui";
import { TeamFormModal } from "@/features/forms/TeamFormModal";
import { useCollection } from "@/hooks/useCollection";
import { confirmDelete, useEntityDialog } from "@/hooks/useEntityDialog";
import { useStaffStore, useTeamsStore } from "@/store";
import type { Team } from "@/types";

export function TeamsView() {
  const { items, isLoading, status, error, refetch } = useCollection(useTeamsStore);
  const staff = useCollection(useStaffStore);
  const remove = useTeamsStore((state) => state.remove);
  const dialog = useEntityDialog<Team>();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Teams"
        description="Cross-department groups for shared queues"
        actions={
          <Button onClick={dialog.openCreate}>
            <Plus className="h-4 w-4" /> Add Team
          </Button>
        }
      />
      {status === "error" && (
        <Card>
          <ErrorState message={error} onRetry={refetch} />
        </Card>
      )}
      {isLoading && <CardGridSkeleton count={5} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((team, i) => {
          const members = staff.items.filter((a) => team.memberIds.includes(a.id));
          return (
            <FadeIn key={team.id} index={i}>
              <Card className="h-full p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                      <UsersRound className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium text-ink-900 dark:text-paper-100">{team.name}</p>
                      <p className="text-xs text-ink-900/45 dark:text-paper-100/45">Led by {team.lead}</p>
                    </div>
                  </div>
                  <RowActions label={team.name} onEdit={() => dialog.openEdit(team)} onDelete={() => confirmDelete("team", team.name, () => remove(team.id))} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-900/60 dark:text-paper-100/60">{team.notes || "No description yet."}</p>
                <div className="mt-4 flex items-center justify-between border-t border-ink-900/[0.06] pt-4 text-sm dark:border-paper-100/[0.06]">
                  <div className="flex -space-x-2">
                    {members.slice(0, 5).map((m) => (
                      <span key={m.id} title={m.name} className="rounded-full ring-2 ring-white dark:ring-ink-900">
                        <Avatar name={m.name} color={m.avatarColor} size="sm" />
                      </span>
                    ))}
                    {members.length > 5 && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/10 text-xs font-medium ring-2 ring-white dark:bg-paper-100/10 dark:ring-ink-900">
                        +{members.length - 5}
                      </span>
                    )}
                  </div>
                  <span className="text-ink-900/50 dark:text-paper-100/50">
                    <span className="font-medium text-ink-900 dark:text-paper-100">{team.members}</span> members
                  </span>
                </div>
              </Card>
            </FadeIn>
          );
        })}
      </div>
      <TeamFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
    </div>
  );
}
