"use client";

import { Building2, Globe, Plus } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { Badge, Button, Card, CardGridSkeleton, ErrorState, PageHeader, RowActions } from "@/components/ui";
import { OrganizationFormModal } from "@/features/forms/OrganizationFormModal";
import { useCollection } from "@/hooks/useCollection";
import { confirmDelete, useEntityDialog } from "@/hooks/useEntityDialog";
import { useOrganizationsStore } from "@/store";
import type { Organization } from "@/types";

export function OrganizationsView() {
  const { items, isLoading, status, error, refetch } = useCollection(useOrganizationsStore);
  const remove = useOrganizationsStore((state) => state.remove);
  const dialog = useEntityDialog<Organization>();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organizations"
        description="Grouped accounts for corporate customers"
        actions={
          <Button onClick={dialog.openCreate}>
            <Plus className="h-4 w-4" /> Add Organization
          </Button>
        }
      />
      {status === "error" && (
        <Card>
          <ErrorState message={error} onRetry={refetch} />
        </Card>
      )}
      {isLoading && <CardGridSkeleton />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((org, i) => (
          <FadeIn key={org.id} index={i}>
            <Card className="h-full p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
                  <Building2 className="h-5 w-5 text-brand-500" />
                </div>
                <div className="flex items-center gap-1">
                  <Badge status={org.status === "Active" ? "Resolved" : "Closed"}>{org.status}</Badge>
                  <RowActions
                    label={org.name}
                    onEdit={() => dialog.openEdit(org)}
                    onDelete={() => confirmDelete("organization", org.name, () => remove(org.id))}
                  />
                </div>
              </div>
              <h2 className="mt-3 font-display font-semibold text-ink-900 dark:text-paper-100">{org.name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-900/45 dark:text-paper-100/45">
                <Globe className="h-3.5 w-3.5" /> {org.domain}
              </p>
              <Link
                href={`/customers?org=${encodeURIComponent(org.name)}`}
                className="mt-4 flex items-center justify-between border-t border-ink-900/[0.06] pt-4 text-sm hover:text-brand-500 dark:border-paper-100/[0.06]"
              >
                <span className="text-ink-900/50 dark:text-paper-100/50">Members</span>
                <span className="font-medium text-ink-900 dark:text-paper-100">{org.users} →</span>
              </Link>
            </Card>
          </FadeIn>
        ))}
      </div>
      <OrganizationFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
    </div>
  );
}
