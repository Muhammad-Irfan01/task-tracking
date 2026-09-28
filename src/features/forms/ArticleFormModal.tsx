"use client";

import { FormModal, Input, Select, Switch, Textarea } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { useZodForm } from "@/hooks/useZodForm";
import { articleSchema } from "@/lib/schemas";
import { toast, useArticlesStore, useFaqCategoriesStore } from "@/store";
import type { FaqArticle } from "@/types";
import type { EntityFormProps } from "./types";

export function ArticleFormModal({ open, entity, onClose, onSaved }: EntityFormProps<FaqArticle>) {
  const { create, update } = useArticlesStore();
  const categories = useCollection(useFaqCategoriesStore);
  const form = useZodForm(articleSchema, {
    category: entity?.category ?? categories.items[0]?.name ?? "",
    question: entity?.question ?? "",
    answer: entity?.answer ?? "",
    published: entity?.published ?? false,
  });

  const onSubmit = form.handleSubmit(async (input) => {
    const saved = entity ? await update(entity.id, input) : await create(input);
    toast.success(entity ? "Article updated" : input.published ? "Article published" : "Draft saved");
    onSaved?.(saved);
    onClose();
  });

  return (
    <FormModal open={open} onClose={onClose} size="lg" title={entity ? "Edit article" : "New article"} onSubmit={onSubmit} submitting={form.submitting}>
      <Select label="Category" {...form.field("category")}>
        <option value="">Choose a category…</option>
        {categories.items.map((c) => (
          <option key={c.id}>{c.name}</option>
        ))}
      </Select>
      <Input label="Question" placeholder="How do I…?" {...form.field("question")} />
      <Textarea label="Answer" rows={8} {...form.field("answer")} />
      <Switch
        label="Published"
        description="Published articles are visible to customers"
        checked={form.values.published}
        onChange={(v) => form.set("published", v)}
      />
    </FormModal>
  );
}
