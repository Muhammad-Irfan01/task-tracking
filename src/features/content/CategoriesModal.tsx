"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Input, Modal, RowActions } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { confirmDelete } from "@/hooks/useEntityDialog";
import { faqCategorySchema, toFieldErrors } from "@/lib/schemas";
import { errorMessage, fieldErrors } from "@/services";
import { toast, useFaqCategoriesStore } from "@/store";
import type { FaqCategory } from "@/types";

/** Inline add / rename / delete for knowledge-base categories. */
export function CategoriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items } = useCollection(useFaqCategoriesStore);
  const { create, update, remove } = useFaqCategoriesStore();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);

  async function save(event: FormEvent, value: string, target?: FaqCategory) {
    event.preventDefault();
    const parsed = faqCategorySchema.safeParse({ name: value });
    if (!parsed.success) return setError(toFieldErrors(parsed.error).name);
    try {
      if (target) await update(target.id, parsed.data);
      else await create(parsed.data);
      toast.success(target ? "Category renamed" : `${parsed.data.name} added`);
      setName("");
      setEditing(null);
      setError(undefined);
    } catch (e) {
      setError(fieldErrors(e).name ?? errorMessage(e));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage categories" description="Articles are grouped by category." size="sm">
      <form onSubmit={(e) => save(e, name)} className="flex items-start gap-2">
        <div className="flex-1">
          <Input aria-label="New category name" placeholder="New category" value={name} error={editing ? undefined : error} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="submit" aria-label="Add category">
          <Plus className="h-4 w-4" />
        </Button>
      </form>
      <ul className="mt-4 divide-y divide-ink-900/[0.06] dark:divide-paper-100/[0.06]">
        {items.map((category) => (
          <li key={category.id} className="flex items-center gap-3 py-2">
            {editing?.id === category.id ? (
              <form onSubmit={(e) => save(e, editing.name, category)} className="flex-1">
                <Input
                  aria-label="Category name"
                  value={editing.name}
                  error={error}
                  onChange={(e) => setEditing({ id: category.id, name: e.target.value })}
                  onBlur={() => setEditing(null)}
                  onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setEditing(null))}
                />
              </form>
            ) : (
              <>
                <span className="flex-1 text-sm text-ink-900 dark:text-paper-100">{category.name}</span>
                <span className="text-xs text-ink-900/40 dark:text-paper-100/40">{category.count} articles</span>
                <RowActions
                  label={category.name}
                  onEdit={() => {
                    setError(undefined);
                    setEditing({ id: category.id, name: category.name });
                  }}
                  onDelete={() => confirmDelete("category", category.name, () => remove(category.id))}
                />
              </>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
