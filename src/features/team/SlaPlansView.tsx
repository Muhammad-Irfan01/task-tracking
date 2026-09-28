"use client";

import { Plus, Timer } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button, Card, CardGridSkeleton, ErrorState, PageHeader, RowActions } from "@/components/ui";
import { SlaPlanFormModal } from "@/features/forms/SlaPlanFormModal";
import { useCollection } from "@/hooks/useCollection";
import { confirmDelete, useEntityDialog } from "@/hooks/useEntityDialog";
import { useSlaPlansStore } from "@/store";
import type { SlaPlan } from "@/types";

export function SlaPlansView() {
  const { items, isLoading, status, error, refetch } = useCollection(useSlaPlansStore);
  const remove = useSlaPlansStore((state) => state.remove);
  const dialog = useEntityDialog<SlaPlan>();

  return (
    <div className="space-y-5">
      <PageHeader
        title="SLA Plans"
        description="Response commitments applied through help topics"
        actions={
          <Button onClick={dialog.openCreate}>
            <Plus className="h-4 w-4" /> Add SLA Plan
          </Button>
        }
      />
      {status === "error" && (
        <Card>
          <ErrorState message={error} onRetry={refetch} />
        </Card>
      )}
      {isLoading && <CardGridSkeleton count={4} className="lg:grid-cols-2" />}
      <div className="grid gap-4 sm:grid-cols-2">
        {[...items]
          .sort((a, b) => b.graceHours - a.graceHours)
          .map((plan, i) => (
            <FadeIn key={plan.id} index={i}>
              <Card className="h-full p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                      <Timer className="h-5 w-5 text-amber-500" />
                    </div>
                    <p className="font-medium text-ink-900 dark:text-paper-100">{plan.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-semibold text-ink-900 dark:text-paper-100">{plan.graceHours}h</span>
                    <RowActions label={plan.name} onEdit={() => dialog.openEdit(plan)} onDelete={() => confirmDelete("SLA plan", plan.name, () => remove(plan.id))} />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-900/60 dark:text-paper-100/60">{plan.notes || "No notes."}</p>
                <div className="mt-4 flex items-center justify-between border-t border-ink-900/[0.06] pt-4 text-sm dark:border-paper-100/[0.06]">
                  <span className="text-ink-900/50 dark:text-paper-100/50">Open tickets on this plan</span>
                  <span className="font-medium text-ink-900 dark:text-paper-100">{plan.tickets}</span>
                </div>
              </Card>
            </FadeIn>
          ))}
      </div>
      <SlaPlanFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
    </div>
  );
}
