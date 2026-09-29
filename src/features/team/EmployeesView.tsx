"use client";

import { Contact, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useCurrentUser } from "@/components/providers/SessionProvider";
import { Avatar, Button, Card, EmptyState, ErrorState, PageHeader, RowActions, RowSkeleton, SearchInput, Table, Td, Tr } from "@/components/ui";
import { EmployeeFormModal } from "@/features/forms/EmployeeFormModal";
import { useCollection } from "@/hooks/useCollection";
import { useDebounce } from "@/hooks/useDebounce";
import { confirmDelete, useEntityDialog } from "@/hooks/useEntityDialog";
import { useEmployeesStore } from "@/store";
import type { Employee } from "@/types";

/** Org admins manage the people who raise tickets through the portal. */
export function EmployeesView() {
  const user = useCurrentUser();
  const { items, isLoading, status, error, refetch } = useCollection(useEmployeesStore);
  const remove = useEmployeesStore((state) => state.remove);
  const dialog = useEntityDialog<Employee>();
  const [search, setSearch] = useState("");
  const query = useDebounce(search, 250).toLowerCase();
  const filtered = useMemo(
    () => items.filter((e) => !query || e.name.toLowerCase().includes(query) || e.email.toLowerCase().includes(query) || e.dept.toLowerCase().includes(query)),
    [items, query],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        description="People who sign in to the request portal to raise tickets to your departments"
        actions={
          user.isAdmin && (
            <Button onClick={dialog.openCreate}>
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
          )
        }
      />
      <Card className="p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search employees by name, email, or department…" />
      </Card>
      <Card>
        {status === "error" && <ErrorState message={error} onRetry={refetch} />}
        {isLoading && (
          <div className="px-4">
            {[0, 1, 2].map((i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )}
        {status === "success" && items.length === 0 && (
          <EmptyState
            icon={Contact}
            title="No employees yet"
            description="Add employees so they can raise requests to your departments from the portal."
            action={
              user.isAdmin && (
                <Button onClick={dialog.openCreate}>
                  <Plus className="h-4 w-4" /> Add Employee
                </Button>
              )
            }
          />
        )}
        {items.length > 0 && (
          <Table columns={["Employee", "Department", "Tickets", "Status", ""]}>
            {filtered.map((e) => (
              <Tr key={e.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={e.name} color={e.avatarColor} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900 dark:text-paper-100">{e.name}</p>
                      <p className="truncate text-xs text-ink-900/45 dark:text-paper-100/45">{e.email}</p>
                    </div>
                  </div>
                </Td>
                <Td muted>{e.dept}</Td>
                <Td muted>
                  {e.openTickets} open · {e.totalTickets} total
                </Td>
                <Td muted>{!e.active ? "Inactive" : e.hasPassword ? "Active" : "Invited"}</Td>
                <Td className="text-right">
                  {user.isAdmin && (
                    <RowActions
                      label={e.name}
                      onEdit={() => dialog.openEdit(e)}
                      onDelete={() => confirmDelete("employee", e.name, () => remove(e.id))}
                    />
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>
      <EmployeeFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
    </div>
  );
}
