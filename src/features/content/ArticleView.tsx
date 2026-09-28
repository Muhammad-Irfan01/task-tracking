"use client";

import { Eye, EyeOff, FileQuestionMark, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { BackLink, Badge, Button, Card, EmptyState, ErrorState, LinkButton, Skeleton } from "@/components/ui";
import { ArticleFormModal } from "@/features/forms/ArticleFormModal";
import { useCollection } from "@/hooks/useCollection";
import { confirmDelete, useEntityDialog } from "@/hooks/useEntityDialog";
import { articlesService, errorMessage } from "@/services";
import { toast, useArticlesStore } from "@/store";
import type { FaqArticle } from "@/types";

// Counts each article once per page load, even under StrictMode's double effects.
const viewed = new Set<string>();

export function ArticleView({ id }: { id: string }) {
  const router = useRouter();
  const { items, isLoading, status, error, refetch } = useCollection(useArticlesStore);
  const { update, remove } = useArticlesStore();
  const dialog = useEntityDialog<FaqArticle>();
  const article = items.find((a) => String(a.id) === id);

  useEffect(() => {
    if (viewed.has(id)) return;
    viewed.add(id);
    articlesService
      .recordView(id)
      .then((updated) => useArticlesStore.setState((s) => ({ items: s.items.map((a) => (a.id === updated.id ? updated : a)) })))
      .catch(() => viewed.delete(id));
  }, [id]);

  if (status === "error") {
    return (
      <Card>
        <ErrorState message={error} onRetry={refetch} />
      </Card>
    );
  }

  if (!isLoading && !article) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={FileQuestionMark}
          title="Article not found"
          action={
            <LinkButton href="/knowledge-base" variant="secondary">
              Back to knowledge base
            </LinkButton>
          }
        />
      </Card>
    );
  }

  async function togglePublished() {
    if (!article) return;
    try {
      await update(article.id, { published: !article.published });
      toast.success(article.published ? "Moved back to drafts" : "Article published");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function onDelete() {
    if (article && (await confirmDelete("article", article.question, () => remove(article.id)))) router.push("/knowledge-base");
  }

  return (
    <div className="max-w-3xl space-y-5">
      <BackLink href="/knowledge-base" label="Back to knowledge base" />
      <Card className="p-6">
        {article ? (
          <FadeIn>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-brand-500">{article.category}</p>
              <Badge status={article.published ? "Resolved" : "On Hold"}>{article.published ? "Published" : "Draft"}</Badge>
            </div>
            <h1 className="mt-2 font-display text-xl font-semibold text-ink-900 dark:text-paper-100">{article.question}</h1>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-800 dark:text-paper-100/80">{article.answer}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-900/[0.06] pt-4 dark:border-paper-100/[0.06]">
              <p className="flex items-center gap-1.5 text-xs text-ink-900/40 dark:text-paper-100/40">
                <Eye className="h-3.5 w-3.5" /> {article.views.toLocaleString("en-US")} views
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={togglePublished}>
                  {article.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {article.published ? "Unpublish" : "Publish"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => dialog.openEdit(article)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete} className="text-rose-500">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          </FadeIn>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
      </Card>
      <ArticleFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
    </div>
  );
}
