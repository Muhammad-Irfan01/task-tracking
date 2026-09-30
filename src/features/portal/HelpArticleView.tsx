"use client";

import { FileQuestionMark, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { BackLink, Card, EmptyState, LinkButton, Skeleton } from "@/components/ui";
import { portalService } from "@/services";
import type { HelpArticle } from "@/types";

// One request per article per page load (it counts a view), even under StrictMode's double effects.
const loads = new Map<string, Promise<HelpArticle>>();

export function HelpArticleView({ id }: { id: string }) {
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    if (!loads.has(id)) loads.set(id, portalService.helpArticle(id));
    loads
      .get(id)!
      .then((a) => active && setArticle(a))
      .catch(() => {
        loads.delete(id);
        if (active) setMissing(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (missing) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={FileQuestionMark}
          title="Article not found"
          description="It may have been removed or unpublished."
          action={
            <LinkButton href="/portal/help" variant="secondary">
              Back to the help center
            </LinkButton>
          }
        />
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <BackLink href="/portal/help" label="Back to the help center" />
      <Card className="p-6">
        {article ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">{article.category}</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900 dark:text-paper-100">{article.question}</h1>
            <div className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-800 dark:text-paper-100/85">{article.answer}</div>
          </>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-ink-900/60 dark:text-paper-100/60">Didn&apos;t solve your problem?</p>
        <LinkButton href="/portal/new" size="sm">
          <Plus className="h-4 w-4" /> Raise a ticket
        </LinkButton>
      </Card>
    </div>
  );
}
