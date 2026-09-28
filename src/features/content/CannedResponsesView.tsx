"use client";

import { ChevronDown, Copy, MessageSquareText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Collapse } from "@/components/motion/Collapse";
import { FadeIn } from "@/components/motion/FadeIn";
import { Badge, Button, Card, ErrorState, PageHeader, RowActions, RowSkeleton, SearchInput, Switch } from "@/components/ui";
import { CannedResponseFormModal } from "@/features/forms/CannedResponseFormModal";
import { useCollection } from "@/hooks/useCollection";
import { useDebounce } from "@/hooks/useDebounce";
import { confirmDelete, useEntityDialog } from "@/hooks/useEntityDialog";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/services";
import { toast, useCannedResponsesStore } from "@/store";
import type { CannedResponse } from "@/types";

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Response copied to clipboard");
  } catch {
    toast.error("Couldn't access the clipboard");
  }
}

export function CannedResponsesView() {
  const { items, isLoading, status, error, refetch } = useCollection(useCannedResponsesStore);
  const { update, remove } = useCannedResponsesStore();
  const dialog = useEntityDialog<CannedResponse>();
  const [openId, setOpenId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const query = useDebounce(search, 250).toLowerCase();
  const filtered = useMemo(
    () => items.filter((r) => !query || r.title.toLowerCase().includes(query) || r.body.toLowerCase().includes(query) || r.dept.toLowerCase().includes(query)),
    [items, query],
  );

  async function toggle(response: CannedResponse) {
    try {
      await update(response.id, { enabled: !response.enabled });
      toast.success(response.enabled ? `${response.title} disabled` : `${response.title} enabled`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Canned Responses"
        description="Reusable replies agents can insert into tickets"
        actions={
          <Button onClick={dialog.openCreate}>
            <Plus className="h-4 w-4" /> Add Response
          </Button>
        }
      />
      <Card className="p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search responses…" />
      </Card>

      {status === "error" && (
        <Card>
          <ErrorState message={error} onRetry={refetch} />
        </Card>
      )}
      {isLoading && (
        <Card className="p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <RowSkeleton key={i} />
          ))}
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((response, i) => {
          const open = openId === response.id;
          return (
            <FadeIn key={response.id} index={i}>
              <Card className="overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => setOpenId(open ? null : response.id)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
                      <MessageSquareText className="h-4 w-4 text-brand-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-900 dark:text-paper-100">{response.title}</p>
                      <p className="text-xs text-ink-900/45 dark:text-paper-100/45">{response.dept}</p>
                    </div>
                    <Badge status={response.enabled ? "Resolved" : "Closed"} className="hidden sm:inline-flex">
                      {response.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <ChevronDown
                      className={cn("h-4 w-4 shrink-0 text-ink-900/40 transition-transform duration-200 dark:text-paper-100/40", open && "rotate-180")}
                    />
                  </button>
                </div>
                <Collapse open={open}>
                  <div className="border-t border-ink-900/[0.06] px-4 pb-4 dark:border-paper-100/[0.06]">
                    <p className="whitespace-pre-line pt-3 text-sm leading-relaxed text-ink-800 dark:text-paper-100/80">{response.body}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <Switch label="Enabled" checked={response.enabled} onChange={() => toggle(response)} className="gap-3" />
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(response.body)}>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </Button>
                        <RowActions
                          label={response.title}
                          onEdit={() => dialog.openEdit(response)}
                          onDelete={() => confirmDelete("canned response", response.title, () => remove(response.id))}
                        />
                      </div>
                    </div>
                  </div>
                </Collapse>
              </Card>
            </FadeIn>
          );
        })}
      </div>
      <CannedResponseFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
    </div>
  );
}
