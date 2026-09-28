"use client";

import { BookOpen, Eye, FolderCog, Plus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, RowSkeleton, SearchInput, Select } from "@/components/ui";
import { ArticleFormModal } from "@/features/forms/ArticleFormModal";
import { useCollection } from "@/hooks/useCollection";
import { useDebounce } from "@/hooks/useDebounce";
import { useEntityDialog } from "@/hooks/useEntityDialog";
import { cn } from "@/lib/utils";
import { useArticlesStore, useFaqCategoriesStore } from "@/store";
import type { FaqArticle } from "@/types";
import { CategoriesModal } from "./CategoriesModal";

type Visibility = "all" | "published" | "draft";

export function KnowledgeBaseView() {
  const articles = useCollection(useArticlesStore);
  const categories = useCollection(useFaqCategoriesStore);
  const dialog = useEntityDialog<FaqArticle>();
  const [managing, setManaging] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [visibility, setVisibility] = useState<Visibility>("all");
  const query = useDebounce(search, 250).toLowerCase();

  const filtered = useMemo(
    () =>
      articles.items
        .filter(
          (a) =>
            (category === "All" || a.category === category) &&
            (visibility === "all" || a.published === (visibility === "published")) &&
            (!query || a.question.toLowerCase().includes(query) || a.answer.toLowerCase().includes(query)),
        )
        .sort((a, b) => b.views - a.views),
    [articles.items, category, visibility, query],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Knowledge Base"
        description="Self-service articles shown to customers"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setManaging(true)}>
              <FolderCog className="h-4 w-4" /> Categories
            </Button>
            <Button onClick={dialog.openCreate}>
              <Plus className="h-4 w-4" /> Add Article
            </Button>
          </div>
        }
      />

      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search questions and answers…" className="flex-1" />
          <div className="shrink-0 sm:w-44">
            <Select aria-label="Filter by visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
              <option value="all">All articles</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {[{ name: "All", count: articles.items.length }, ...categories.items].map(({ name, count }) => {
            const active = category === name;
            return (
              <button
                key={name}
                onClick={() => setCategory(name)}
                aria-pressed={active}
                className={cn(
                  "relative rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-brand-500 text-white"
                    : "border-ink-900/10 text-ink-700 hover:bg-ink-900/[0.03] dark:border-paper-100/10 dark:text-paper-100/70 dark:hover:bg-paper-100/[0.05]",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="kb-category-pill"
                    className="absolute inset-0 rounded-full bg-brand-500"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative">
                  {name} <span className="opacity-60">{count}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {articles.status === "error" && (
        <Card>
          <ErrorState message={articles.error} onRetry={articles.refetch} />
        </Card>
      )}
      {articles.isLoading && (
        <Card className="p-5">
          {Array.from({ length: 4 }, (_, i) => (
            <RowSkeleton key={i} />
          ))}
        </Card>
      )}

      <div className="grid gap-4">
        {filtered.map((article, i) => (
          <FadeIn key={article.id} index={i}>
            <Link href={`/knowledge-base/${article.id}`} className="block">
              <Card className="p-5 transition-shadow hover:shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-brand-500">{article.category}</p>
                    <h2 className="font-display font-semibold text-ink-900 dark:text-paper-100">{article.question}</h2>
                    <p className="mt-1.5 line-clamp-2 text-sm text-ink-900/55 dark:text-paper-100/55">{article.answer}</p>
                  </div>
                  <Badge status={article.published ? "Resolved" : "On Hold"}>{article.published ? "Published" : "Draft"}</Badge>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-900/40 dark:text-paper-100/40">
                  <Eye className="h-3.5 w-3.5" /> {article.views.toLocaleString("en-US")} views
                </p>
              </Card>
            </Link>
          </FadeIn>
        ))}
      </div>

      {!articles.isLoading && articles.status !== "error" && filtered.length === 0 && (
        <Card>
          <EmptyState icon={BookOpen} title="No articles found" description="Try another search, or write the first article for this topic." />
        </Card>
      )}

      <ArticleFormModal key={dialog.key} open={dialog.open} entity={dialog.editing} onClose={dialog.close} />
      <CategoriesModal open={managing} onClose={() => setManaging(false)} />
    </div>
  );
}
