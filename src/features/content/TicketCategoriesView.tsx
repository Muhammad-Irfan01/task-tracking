"use client";

import { Plus, Tags } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, RowActions, Skeleton } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { errorMessage, fieldErrors } from "@/services";
import { confirm, toast, useDepartmentsStore, useTicketCategoriesStore, useTicketSubcategoriesStore } from "@/store";
import { cn } from "@/lib/utils";
import type { TicketCategoryEntry } from "@/types";

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/**
 * Admins manage, per department, the categories and sub-categories offered
 * when a ticket is raised (desk and portal).
 */
export function TicketCategoriesView() {
  const departments = useCollection(useDepartmentsStore);
  const categories = useCollection(useTicketCategoriesStore);
  const { create, update, remove } = useTicketCategoriesStore();
  const subcategories = useTicketSubcategoriesStore();
  const [selected, setSelected] = useState<string | null>(null);

  const countFor = (department: string) => categories.items.filter((c) => c.department === department).length;
  // Start on the first department that has categories, so the page opens on something useful.
  const current =
    departments.items.find((d) => d.name === selected)?.name ??
    departments.items.find((d) => countFor(d.name) > 0)?.name ??
    departments.items[0]?.name;
  const shown = categories.items.filter((c) => c.department === current);
  const loading = departments.isLoading || categories.isLoading;
  const failed = departments.status === "error" || categories.status === "error";

  async function removeCategory(category: TicketCategoryEntry) {
    const subs = category.subcategories.length;
    try {
      const ok = await confirm({
        title: "Delete category?",
        description: `“${category.name}”${subs ? ` and its ${plural(subs, "sub-category", "sub-categories")}` : ""} will be removed.${
          category.tickets ? ` ${plural(category.tickets, "ticket")} keep their department but lose this category.` : ""
        } This can't be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
        action: () => remove(category.id),
      });
      if (ok) toast.success("Category deleted");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function removeSubcategory(sub: { id: number; name: string; tickets: number }) {
    try {
      const ok = await confirm({
        title: "Delete sub-category?",
        description: `“${sub.name}” will be removed.${sub.tickets ? ` ${plural(sub.tickets, "ticket")} keep their category but lose this sub-category.` : ""} This can't be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
        action: () => subcategories.remove(sub.id),
      });
      if (ok) toast.success("Sub-category deleted");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ticket Categories"
        description="When someone raises a ticket they pick a department, then one of its categories, then a sub-category."
      />

      {failed ? (
        <Card>
          <ErrorState
            message={departments.error ?? categories.error}
            onRetry={() => {
              departments.refetch();
              categories.refetch();
            }}
          />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <Card className="h-fit p-2">
            <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-ink-900/40 dark:text-paper-100/40">Departments</p>
            {loading && <Skeleton className="m-2 h-24" />}
            <ul>
              {departments.items.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(d.name)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      d.name === current
                        ? "bg-brand-500/10 font-medium text-brand-600 dark:text-brand-300"
                        : "text-ink-900/70 hover:bg-ink-900/[0.04] dark:text-paper-100/70 dark:hover:bg-paper-100/[0.06]",
                    )}
                  >
                    <span className="truncate">{d.name}</span>
                    <span className="text-xs text-ink-900/40 dark:text-paper-100/40">{countFor(d.name)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-4 p-5">
            {loading || !current ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div>
                  <h2 className="font-display font-semibold text-ink-900 dark:text-paper-100">{current}</h2>
                  <p className="text-sm text-ink-900/50 dark:text-paper-100/50">{plural(shown.length, "category", "categories")}</p>
                </div>
                <AddNameForm
                  key={current}
                  placeholder="New category, e.g. Hardware"
                  label="Add category"
                  onAdd={async (name) => {
                    await create({ department: current, name });
                    toast.success(`${name} added to ${current}`);
                  }}
                />
                {shown.length === 0 ? (
                  <EmptyState
                    icon={Tags}
                    title="No categories yet"
                    description="Tickets to this department are raised without a category. Add one above to offer a choice."
                  />
                ) : (
                  <div className="space-y-3">
                    {shown.map((category) => (
                      <section key={category.id} className="rounded-xl border border-ink-900/[0.08] p-4 dark:border-paper-100/[0.08]">
                        <NameRow
                          name={category.name}
                          meta={plural(category.tickets, "ticket")}
                          strong
                          onRename={async (name) => {
                            await update(category.id, { name });
                            toast.success("Category renamed");
                          }}
                          onDelete={() => removeCategory(category)}
                        />
                        <ul className="mt-2 divide-y divide-ink-900/[0.06] border-l-2 border-ink-900/[0.06] pl-4 dark:divide-paper-100/[0.06] dark:border-paper-100/[0.08]">
                          {category.subcategories.map((sub) => (
                            <li key={sub.id}>
                              <NameRow
                                name={sub.name}
                                meta={plural(sub.tickets, "ticket")}
                                onRename={async (name) => {
                                  await subcategories.update(sub.id, { name });
                                  toast.success("Sub-category renamed");
                                }}
                                onDelete={() => removeSubcategory(sub)}
                              />
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 pl-4">
                          <AddNameForm
                            placeholder="New sub-category"
                            label={`Add sub-category to ${category.name}`}
                            small
                            onAdd={async (name) => {
                              await subcategories.create({ categoryId: category.id, name });
                              toast.success(`${name} added to ${category.name}`);
                            }}
                          />
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/** A name input with an add button; shows the server's error under the input. */
function AddNameForm({ placeholder, label, small, onAdd }: { placeholder: string; label: string; small?: boolean; onAdd: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Enter a name");
    setSaving(true);
    try {
      await onAdd(name.trim());
      setName("");
      setError(undefined);
    } catch (e) {
      setError(fieldErrors(e).name ?? errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-start gap-2">
      <div className="flex-1">
        <Input aria-label={label} placeholder={placeholder} value={name} error={error} className={small ? "py-1.5" : undefined} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button type="submit" variant={small ? "secondary" : "primary"} size={small ? "sm" : "md"} aria-label={label} loading={saving}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}

/** A name with rename (inline: Enter saves, Escape cancels) and delete actions. */
function NameRow({ name, meta, strong, onRename, onDelete }: { name: string; meta: ReactNode; strong?: boolean; onRename: (name: string) => Promise<void>; onDelete: () => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  async function save(event: FormEvent) {
    event.preventDefault();
    const next = draft?.trim() ?? "";
    if (!next) return setError("Enter a name");
    if (next === name) return setDraft(null);
    try {
      await onRename(next);
      setDraft(null);
      setError(undefined);
    } catch (e) {
      setError(fieldErrors(e).name ?? errorMessage(e));
    }
  }

  if (draft !== null) {
    return (
      <form onSubmit={save} className="py-1.5">
        <Input
          aria-label={`Rename ${name}`}
          value={draft}
          error={error}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => (setDraft(null), setError(undefined))}
          onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setDraft(null), setError(undefined))}
        />
      </form>
    );
  }
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={cn("flex-1 text-sm text-ink-900 dark:text-paper-100", strong && "font-medium")}>{name}</span>
      <span className="text-xs text-ink-900/40 dark:text-paper-100/40">{meta}</span>
      <RowActions label={name} onEdit={() => setDraft(name)} onDelete={onDelete} />
    </div>
  );
}
