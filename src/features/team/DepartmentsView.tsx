"use client";

import { Network, Plus, Users } from "lucide-react";
import Link from "next/link";
import { Badge, Button, Card, ErrorState, PageHeader, RowActions, RowSkeleton, Table, Td, Tr } from "@/components/ui";
import { DepartmentFormModal } from "@/features/forms/DepartmentFormModal";
import { useCollection } from "@/hooks/useCollection";
import { confirmDelete, useEntityDialog } from "@/hooks/useEntityDialog";
import { useDepartmentsStore } from "@/store";
import type { Department } from "@/types";

export function DepartmentsView() {
  const { items, isLoading, status, error, refetch } = useCollection(useDepartmentsStore);
  const remove = useDepartmentsStore((state) => state.remove);
  const dialog = useEntityDialog<Department>();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Departments"
        description="How ticket queues are organized across the desk"
        actions={
          <Button onClick={dialog.openCreate}>
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        }
      />
      <Card className="overflow-hidden">
        {status === "error" ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <Table columns={["Department", "Manager", "Agents", "Open Tickets", "Visibility", ""]}>
            {isLoading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={6}>
                    <RowSkeleton />
                  </td>
                </tr>
              ))}
            {items.map((dept) => (
              <Tr key={dept.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                      <Network className="h-4 w-4 text-brand-500" />
                    </div>
                    <span className="font-medium text-ink-900 dark:text-paper-100">{dept.name}</span>
                  </div>
                </Td>
                <Td muted>{dept.manager}</Td>
                <Td muted>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-ink-900/35 dark:text-paper-100/35" />
                    {dept.agents}
                  </span>
                </Td>
                <Td muted>
                  <Link href={`/tickets?department=${encodeURIComponent(dept.name)}`} className="hover:text-brand-500">
                    {dept.ticketsOpen}
                  </Link>
                </Td>
                <Td>
                  <Badge status={dept.isPublic ? "Resolved" : "Closed"}>{dept.isPublic ? "Public" : "Internal"}</Badge>
                </Td>
                <Td>
                  <RowActions
                    label={dept.name}
                    onEdit={() => dialog.openEdit(dept)}
                    onDelete={() => confirmDelete("department", dept.name, () => remove(dept.id))}
                  />
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>
      <DepartmentFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
    </div>
  );
}
