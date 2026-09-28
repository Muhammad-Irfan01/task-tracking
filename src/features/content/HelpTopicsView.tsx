"use client";

import { LifeBuoy, Plus } from "lucide-react";
import Link from "next/link";
import { Badge, Button, Card, ErrorState, PageHeader, RowActions, RowSkeleton, Table, Td, Tr } from "@/components/ui";
import { HelpTopicFormModal } from "@/features/forms/HelpTopicFormModal";
import { useCollection } from "@/hooks/useCollection";
import { confirmDelete, useEntityDialog } from "@/hooks/useEntityDialog";
import { useHelpTopicsStore } from "@/store";
import type { HelpTopic } from "@/types";

export function HelpTopicsView() {
  const { items, isLoading, status, error, refetch } = useCollection(useHelpTopicsStore);
  const remove = useHelpTopicsStore((state) => state.remove);
  const dialog = useEntityDialog<HelpTopic>();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Help Topics"
        description="Routing rules customers select when opening a ticket"
        actions={
          <Button onClick={dialog.openCreate}>
            <Plus className="h-4 w-4" /> Add Help Topic
          </Button>
        }
      />
      <Card className="overflow-hidden">
        {status === "error" ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <Table columns={["Topic", "Routed department", "SLA plan", "Tickets (30d)", ""]}>
            {isLoading &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={5}>
                    <RowSkeleton />
                  </td>
                </tr>
              ))}
            {items.map((topic) => (
              <Tr key={topic.id}>
                <Td className="font-medium text-ink-900 dark:text-paper-100">
                  <span className="flex items-center gap-2">
                    <LifeBuoy className="h-4 w-4 shrink-0 text-brand-500" /> {topic.name}
                  </span>
                </Td>
                <Td muted>{topic.dept}</Td>
                <Td>
                  <Badge status="Open">{topic.sla}</Badge>
                </Td>
                <Td muted>
                  <Link href={`/tickets?q=${encodeURIComponent(topic.name)}`} className="hover:text-brand-500">
                    {topic.ticketsThisMonth}
                  </Link>
                </Td>
                <Td>
                  <RowActions label={topic.name} onEdit={() => dialog.openEdit(topic)} onDelete={() => confirmDelete("help topic", topic.name, () => remove(topic.id))} />
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>
      <HelpTopicFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
    </div>
  );
}
