"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePublishedHelpArticles } from "@/hooks/use-help-articles";
import type { HelpArticle, HelpArticleAudience } from "@/lib/help-articles-data";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// The actual reading experience — shared by the real, store-driven
// HelpArticleDetailClient below and by Admin's article preview (which needs
// to render a Draft that isn't published yet, so it can't go through
// usePublishedHelpArticles).
export function HelpArticleView({
  article,
  related,
  backHref,
  backLabel,
  contactSupportHref,
  articleBasePath,
  relatedHrefFor,
}: {
  article: HelpArticle;
  related: HelpArticle[];
  backHref: string;
  backLabel: string;
  contactSupportHref: string;
  // A base path string rather than a function: these props cross the
  // server-to-client component boundary (the route page.tsx files below are
  // server components), and a function can't be serialized across that
  // boundary — only plain data can. Used to build `${articleBasePath}/${slug}`
  // for each related article, unless relatedHrefFor below overrides it.
  articleBasePath: string;
  // Only ever passed by another client component (Admin's preview, which
  // needs to link to a related article's own preview route by id rather
  // than slug) — never by a server page.tsx, so a function prop is safe here.
  relatedHrefFor?: (article: HelpArticle) => string;
}) {
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-5">
      <Link href={backHref} className="flex w-fit items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-primary">
        <ChevronLeft className="size-4" /> {backLabel}
      </Link>

      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-6 sm:p-8">
        <span className="inline-flex rounded-full bg-ensena-bg-soft px-2.5 py-0.5 text-xs font-semibold text-ensena-primary">{article.category}</span>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-ensena-ink">{article.title}</h1>
        <p className="mt-1.5 text-xs text-ensena-muted">Last updated {formatDate(article.updatedAt)}</p>

        <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-ensena-ink">
          {article.content.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-8 border-t border-ensena-border pt-5">
          {feedback === null ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-ensena-ink">Was this helpful?</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFeedback("yes")}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-ensena-border px-3.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                >
                  <ThumbsUp className="size-3.5" /> Yes
                </button>
                <button
                  type="button"
                  onClick={() => setFeedback("no")}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-ensena-border px-3.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                >
                  <ThumbsDown className="size-3.5" /> No
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ensena-muted">
              {feedback === "yes" ? "Glad this helped." : "Thanks for letting us know. Try Contact Support below if you still need help."}
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-sm font-semibold text-ensena-ink">Related articles</h2>
          <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
            {related.map((a) => (
              <li key={a.slug}>
                <Link href={relatedHrefFor ? relatedHrefFor(a) : `${articleBasePath}/${a.slug}`} className="block py-2.5 text-sm text-ensena-primary hover:underline">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <p className="text-sm font-semibold text-ensena-ink">Still need help?</p>
        <p className="mt-1 text-sm text-ensena-muted">If this article didn&apos;t answer your question, our support team can help directly.</p>
        <Button nativeButton={false} render={<Link href={contactSupportHref} />} className="mt-3 h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">
          Contact Support
        </Button>
      </div>
    </div>
  );
}

// The one article-reading page every real Help Center links into — mounted
// at /help-center/articles/[slug], /student-dashboard/help/articles/[slug],
// /tutor-dashboard/help/articles/[slug] and /admin/help/articles/[slug],
// each just passing its own backHref/backLabel/contactSupportHref. Content
// always comes from the shared help-articles-store, never hardcoded here,
// and only ever shows Published articles — see AdminArticlePreviewClient
// for viewing a Draft.
export function HelpArticleDetailClient({
  slug,
  audience,
  backHref,
  backLabel,
  contactSupportHref,
  articleBasePath,
}: {
  slug: string;
  audience: HelpArticleAudience;
  backHref: string;
  backLabel: string;
  contactSupportHref: string;
  articleBasePath: string;
}) {
  const articles = usePublishedHelpArticles(audience);
  const article = articles.find((a) => a.slug === slug);

  if (!article) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This article could not be found.</p>
        <Link href={backHref} className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">
          ← {backLabel}
        </Link>
      </div>
    );
  }

  const related = articles.filter((a) => a.slug !== article.slug && a.category === article.category).slice(0, 3);

  return (
    <HelpArticleView
      article={article}
      related={related}
      backHref={backHref}
      backLabel={backLabel}
      contactSupportHref={contactSupportHref}
      articleBasePath={articleBasePath}
    />
  );
}
