"use client";

import { BookOpen, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Card, EmptyState, ErrorState, LinkButton, PageHeader, RowSkeleton, SearchInput } from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { errorMessage, portalService } from "@/services";
import type { HelpArticle } from "@/types";

/** Self-help before raising a ticket: the organization's published knowledge base. */
export function HelpCenterView() {
  const [articles, setArticles] = useState<HelpArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const query = useDebounce(search, 200).trim().toLowerCase();

  const load = () =>
    portalService
      .helpArticles()
      .then((next) => {
        setArticles(next);
        setError(null);
      })
      .catch((e) => setError(errorMessage(e)));
  useEffect(() => {
    void load();
  }, []);

  const groups = useMemo(() => {
    const matches = (articles ?? []).filter(
      (a) => !query || a.question.toLowerCase().includes(query) || a.answer.toLowerCase().includes(query) || a.category.toLowerCase().includes(query),
    );
    const byCategory = new Map<string, HelpArticle[]>();
    for (const article of matches) byCategory.set(article.category, [...(byCategory.get(article.category) ?? []), article]);
    return [...byCategory.entries()];
  }, [articles, query]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Help center"
        description="Answers to common questions. Can't find yours? Raise a ticket."
        actions={
          <LinkButton href="/portal/new">
            <Plus className="h-4 w-4" /> New ticket
          </LinkButton>
        }
      />
      <Card className="p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search articles…" />
      </Card>

      {error && (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      )}
      {!articles && !error && (
        <Card className="p-5">
          {[0, 1, 2].map((i) => (
            <RowSkeleton key={i} />
          ))}
        </Card>
      )}
      {articles && groups.length === 0 && (
        <Card className="p-6">
          <EmptyState
            icon={BookOpen}
            title={articles.length ? "No articles match your search" : "No help articles yet"}
            description={articles.length ? "Try other words, or raise a ticket and the team will help." : "Raise a ticket and the team will help."}
            action={
              <LinkButton href="/portal/new" variant="secondary">
                New ticket
              </LinkButton>
            }
          />
        </Card>
      )}
      {groups.map(([category, items], g) => (
        <FadeIn key={category} index={g}>
          <Card className="p-2">
            <h2 className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-ink-900/40 dark:text-paper-100/40">{category}</h2>
            <ul>
              {items.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/portal/help/${article.id}`}
                    className="group flex items-center justify-between gap-3 rounded-lg px-3 py-3 hover:bg-ink-900/[0.03] dark:hover:bg-paper-100/[0.04]"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-ink-900 group-hover:text-brand-600 dark:text-paper-100 dark:group-hover:text-brand-300">
                        {article.question}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-ink-900/50 dark:text-paper-100/50">{article.answer}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-900/30 dark:text-paper-100/30" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}
