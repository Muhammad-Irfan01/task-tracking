"use client";

import { Plus, RotateCcw, SlidersHorizontal, Ticket as TicketIcon, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Collapse } from "@/components/motion/Collapse";
import { useCurrentUser } from "@/components/providers/SessionProvider";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  Pagination,
  PriorityDot,
  RowSkeleton,
  SearchInput,
  Select,
  Switch,
  Table,
  Td,
  Tr,
} from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/constants";
import { cn, timeAgo } from "@/lib/utils";
import {
  DEFAULT_TICKET_FILTERS,
  filterTickets,
  useDepartmentsStore,
  useStaffStore,
  useTicketsStore,
  type TicketFilters,
  type TicketSort,
} from "@/store";
import type { Ticket } from "@/types";

const PAGE_SIZE = 10;

const SORTS: { value: TicketSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Newest first" },
  { value: "priority", label: "Highest priority" },
  { value: "due", label: "Due soonest" },
];

function StatusBadge({ ticket }: { ticket: Ticket }) {
  if (ticket.isOverdue && ticket.status !== "Overdue") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Badge status={ticket.status} />
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title="SLA breached" />
      </span>
    );
  }
  return <Badge status={ticket.status} />;
}

export function TicketsListView({ initialFilters }: { initialFilters: Partial<TicketFilters> | null }) {
  const user = useCurrentUser();
  const { items, isLoading, status, error, refetch } = useCollection(useTicketsStore);
  const departments = useCollection(useDepartmentsStore);
  const staff = useCollection(useStaffStore);
  const filters = useTicketsStore((state) => state.filters);
  const setFilter = useTicketsStore((state) => state.setFilter);
  const setFilters = useTicketsStore((state) => state.setFilters);
  const resetFilters = useTicketsStore((state) => state.resetFilters);
  const query = useDebounce(filters.query, 250);

  // Links like /tickets?overdue=1 or ?department=… seed the filters once.
  useEffect(() => {
    if (initialFilters) setFilters({ ...DEFAULT_TICKET_FILTERS, ...initialFilters });
  }, [initialFilters, setFilters]);

  const advancedActive =
    filters.department !== "All" || filters.assignee !== "All" || filters.overdueOnly || filters.sort !== "updated";
  const [showMore, setShowMore] = useState(advancedActive);

  const filtered = useMemo(() => filterTickets(items, { ...filters, query }), [items, filters, query]);
  const { page, setPage, totalPages, paginated } = usePagination(filtered, PAGE_SIZE);
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_TICKET_FILTERS);
  const mine = filters.assignee === user.name;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tickets"
        description={isLoading ? "Loading tickets…" : `${filtered.length} of ${items.length} tickets match your filters`}
        actions={
          <LinkButton href="/tickets/new">
            <Plus className="h-4 w-4" /> New Ticket
          </LinkButton>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={filters.query}
            onChange={(value) => setFilter("query", value)}
            placeholder="Search by subject, number, customer, or organization…"
            className="flex-1"
          />
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
              <Select
                aria-label="Filter by status"
                value={filters.status}
                onChange={(e) => setFilter("status", e.target.value as TicketFilters["status"])}
              >
                <option value="All">All statuses</option>
                {TICKET_STATUSES.map((s) => (
                  <option key={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
              <Select
                aria-label="Filter by priority"
                value={filters.priority}
                onChange={(e) => setFilter("priority", e.target.value as TicketFilters["priority"])}
              >
                <option value="All">All priorities</option>
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
            <Button
              variant={mine ? "primary" : "secondary"}
              onClick={() => setFilter("assignee", mine ? "All" : user.name)}
              aria-pressed={mine}
            >
              <UserRound className="h-4 w-4" /> Mine
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              aria-label="More filters"
              title="More filters"
              className={cn(advancedActive && "text-brand-500")}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button variant="secondary" onClick={resetFilters} disabled={!hasFilters} aria-label="Reset filters" title="Reset filters">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Collapse open={showMore}>
          <div className="mt-3 grid gap-3 border-t border-ink-900/[0.06] pt-3 sm:grid-cols-2 lg:grid-cols-4 dark:border-paper-100/[0.06]">
            <Select label="Department" value={filters.department} onChange={(e) => setFilter("department", e.target.value)}>
              <option value="All">All departments</option>
              {departments.items.map((d) => (
                <option key={d.id}>{d.name}</option>
              ))}
            </Select>
            <Select label="Assignee" value={filters.assignee} onChange={(e) => setFilter("assignee", e.target.value)}>
              <option value="All">Anyone</option>
              {staff.items.map((a) => (
                <option key={a.id}>{a.name}</option>
              ))}
            </Select>
            <Select label="Sort by" value={filters.sort} onChange={(e) => setFilter("sort", e.target.value as TicketSort)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <div className="flex items-end pb-2.5">
              <Switch
                className="w-full"
                label="SLA breached only"
                checked={filters.overdueOnly}
                onChange={(checked) => setFilter("overdueOnly", checked)}
              />
            </div>
          </div>
        </Collapse>
      </Card>

      <Card className="overflow-hidden">
        {status === "error" ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <>
            <div className="hidden md:block">
              <Table columns={["Ticket", "Customer", "Status", "Priority", "Assignee", "Updated"]}>
                {isLoading &&
                  Array.from({ length: 6 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={6}>
                        <RowSkeleton />
                      </td>
                    </tr>
                  ))}
                {paginated.map((ticket) => (
                  <Tr key={ticket.id} className="group">
                    <Td>
                      <Link href={`/tickets/${ticket.id}`} className="block max-w-xs">
                        <p className="truncate font-medium text-ink-900 transition-colors group-hover:text-brand-500 dark:text-paper-100">
                          {ticket.subject}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-ink-900/40 dark:text-paper-100/40">{ticket.number}</p>
                      </Link>
                    </Td>
                    <Td muted>
                      <p>{ticket.customer}</p>
                      <p className="text-xs text-ink-900/40 dark:text-paper-100/40">{ticket.organization}</p>
                    </Td>
                    <Td>
                      <StatusBadge ticket={ticket} />
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5">
                        <PriorityDot priority={ticket.priority} pulse />
                        {ticket.priority}
                      </span>
                    </Td>
                    <Td muted>{ticket.assignee}</Td>
                    <Td className="whitespace-nowrap text-ink-900/50 dark:text-paper-100/50">{timeAgo(ticket.updated)}</Td>
                  </Tr>
                ))}
              </Table>
            </div>

            <div className="divide-y divide-ink-900/[0.06] md:hidden dark:divide-paper-100/[0.06]">
              {isLoading && Array.from({ length: 4 }, (_, i) => <RowSkeleton key={i} />)}
              {paginated.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="block p-4 active:bg-ink-900/[0.02] dark:active:bg-paper-100/[0.03]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink-900 dark:text-paper-100">{ticket.subject}</p>
                    <StatusBadge ticket={ticket} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-ink-900/40 dark:text-paper-100/40">
                    {ticket.number} · {ticket.customer}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-900/50 dark:text-paper-100/50">
                    <PriorityDot priority={ticket.priority} /> {ticket.priority} · {ticket.assignee} · {timeAgo(ticket.updated)}
                  </div>
                </Link>
              ))}
            </div>

            {!isLoading && filtered.length === 0 && (
              <EmptyState
                icon={TicketIcon}
                title="No tickets found"
                description="Try adjusting your search or filters to find what you're looking for."
                action={
                  hasFilters && (
                    <Button variant="secondary" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  )
                }
              />
            )}
            {!isLoading && filtered.length > 0 && (
              <div className="px-4">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} total={filtered.length} pageSize={PAGE_SIZE} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
