"use client";

import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  RowActions,
  RowSkeleton,
  SearchInput,
  Select,
  Table,
  Td,
  Tr,
} from "@/components/ui";
import { CustomerFormModal } from "@/features/forms/CustomerFormModal";
import { useCollection } from "@/hooks/useCollection";
import { useDebounce } from "@/hooks/useDebounce";
import { confirmDelete, useEntityDialog } from "@/hooks/useEntityDialog";
import { usePagination } from "@/hooks/usePagination";
import { formatDate } from "@/lib/utils";
import { useCustomersStore, useOrganizationsStore } from "@/store";
import type { Customer } from "@/types";
import { CUSTOMER_BADGE_TONE } from "./customer-status";

const PAGE_SIZE = 10;

export function CustomersListView({ initialQuery = "", initialOrg = "All" }: { initialQuery?: string; initialOrg?: string }) {
  const { items, isLoading, status, error, refetch } = useCollection(useCustomersStore);
  const orgs = useCollection(useOrganizationsStore);
  const remove = useCustomersStore((state) => state.remove);
  const dialog = useEntityDialog<Customer>();
  const [search, setSearch] = useState(initialQuery);
  const [org, setOrg] = useState(initialOrg);
  const query = useDebounce(search, 250).toLowerCase();

  const filtered = useMemo(
    () =>
      items.filter(
        (c) =>
          (org === "All" || c.organization === org) &&
          (!query ||
            c.name.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query) ||
            c.organization.toLowerCase().includes(query)),
      ),
    [items, query, org],
  );
  const { page, setPage, totalPages, paginated } = usePagination(filtered, PAGE_SIZE);
  const onDelete = (c: Customer) => confirmDelete("customer", c.name, () => remove(c.id));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description={isLoading ? "Loading customers…" : `${filtered.length} customer accounts`}
        actions={
          <Button onClick={dialog.openCreate}>
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        }
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search customers by name, email, or organization…" className="flex-1" />
        <div className="shrink-0 sm:w-60">
          <Select aria-label="Filter by organization" value={org} onChange={(e) => setOrg(e.target.value)}>
            <option value="All">All organizations</option>
            {orgs.items.map((o) => (
              <option key={o.id}>{o.name}</option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {status === "error" ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <>
            <div className="hidden md:block">
              <Table columns={["Customer", "Organization", "Status", "Tickets", "Joined", ""]}>
                {isLoading &&
                  Array.from({ length: 6 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={6}>
                        <RowSkeleton />
                      </td>
                    </tr>
                  ))}
                {paginated.map((customer) => (
                  <Tr key={customer.id} className="group">
                    <Td className="py-3">
                      <Link href={`/customers/${customer.id}`} className="flex items-center gap-3">
                        <Avatar name={customer.name} size="sm" color="bg-brand-400" />
                        <div>
                          <p className="font-medium text-ink-900 transition-colors group-hover:text-brand-500 dark:text-paper-100">{customer.name}</p>
                          <p className="text-xs text-ink-900/45 dark:text-paper-100/45">{customer.email}</p>
                        </div>
                      </Link>
                    </Td>
                    <Td muted className="py-3">
                      {customer.organization}
                    </Td>
                    <Td className="py-3">
                      <Badge status={CUSTOMER_BADGE_TONE[customer.status]}>{customer.status}</Badge>
                    </Td>
                    <Td muted className="py-3">
                      {customer.tickets}
                    </Td>
                    <Td className="py-3 text-ink-900/50 dark:text-paper-100/50">{formatDate(customer.joined)}</Td>
                    <Td className="py-3">
                      <RowActions label={customer.name} onEdit={() => dialog.openEdit(customer)} onDelete={() => onDelete(customer)} />
                    </Td>
                  </Tr>
                ))}
              </Table>
            </div>

            <div className="divide-y divide-ink-900/[0.06] md:hidden dark:divide-paper-100/[0.06]">
              {isLoading && Array.from({ length: 4 }, (_, i) => <RowSkeleton key={i} />)}
              {paginated.map((customer) => (
                <div key={customer.id} className="flex items-center gap-3 p-4">
                  <Link href={`/customers/${customer.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={customer.name} size="sm" color="bg-brand-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900 dark:text-paper-100">{customer.name}</p>
                      <p className="truncate text-xs text-ink-900/45 dark:text-paper-100/45">{customer.organization}</p>
                    </div>
                  </Link>
                  <Badge status={CUSTOMER_BADGE_TONE[customer.status]}>{customer.status}</Badge>
                  <RowActions label={customer.name} onEdit={() => dialog.openEdit(customer)} onDelete={() => onDelete(customer)} />
                </div>
              ))}
            </div>

            {!isLoading && filtered.length === 0 && (
              <EmptyState icon={Users} title="No customers found" description="Try a different search term or organization." />
            )}
            {!isLoading && filtered.length > 0 && (
              <div className="px-4">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} total={filtered.length} pageSize={PAGE_SIZE} />
              </div>
            )}
          </>
        )}
      </Card>

      <CustomerFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
    </div>
  );
}
