"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, MessageCircleQuestion, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/public-pages/breadcrumbs";
import { ContentSection } from "@/components/public-pages/content-section";
import { HelpCategoryCard } from "@/components/public-pages/help-category-card";
import { EmptyState } from "@/components/public-pages/empty-state";
import { findHelpArticle, helpCategories, popularArticleRefs, popularSearches } from "@/lib/help-center-data";
import { buildSupportHref } from "@/lib/support-links";

export function HelpCenterClient() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return helpCategories;
    return helpCategories
      .map((category) => ({
        ...category,
        articles: category.articles.filter(
          (a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q)
        ),
      }))
      .filter(
        (category) =>
          category.title.toLowerCase().includes(q) ||
          category.description.toLowerCase().includes(q) ||
          category.articles.length > 0
      );
  }, [query]);

  const popularArticles = popularArticleRefs
    .map((ref) => {
      const article = findHelpArticle(ref.categorySlug, ref.articleSlug);
      return article ? { ...article, categorySlug: ref.categorySlug } : null;
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  return (
    <div>
      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Help Center" }]} />
      </div>

      <section className="border-b border-ensena-border bg-ensena-bg-soft py-16">
        <div className="mx-auto max-w-[700px] px-4 text-center sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-ensena-ink">
            Help Center
          </h1>
          <p className="mt-3 text-ensena-muted">
            Find answers, learn how Ensena works, and get help with your account, lessons or payments.
          </p>
          <div className="relative mt-7">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-ensena-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for help with bookings, lessons, payments…"
              aria-label="Search for help"
              className="h-13 w-full rounded-full border border-ensena-border bg-ensena-surface py-3.5 pl-12 pr-4 text-sm shadow-sm outline-none focus-visible:border-ensena-primary"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-sm">
            <span className="text-ensena-muted">Popular searches:</span>
            {popularSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="font-medium text-ensena-primary hover:underline"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      <ContentSection eyebrow="Browse by category" title="Help topics">
        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="No results found" description="Try a different search term, or contact support directly." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((category) => (
              <HelpCategoryCard
                key={category.slug}
                icon={category.icon}
                title={category.title}
                description={category.description}
                href={`/help/${category.slug}`}
                articleCount={category.articles.length}
              />
            ))}
          </div>
        )}
      </ContentSection>

      <ContentSection tinted>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="font-heading text-lg font-semibold text-ensena-ink">Popular articles</h2>
            <div className="mt-4 flex flex-col divide-y divide-ensena-border rounded-2xl border border-ensena-border bg-ensena-surface">
              {popularArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/help/${article.categorySlug}/${article.slug}`}
                  className="flex items-start gap-3 p-4 hover:bg-ensena-bg-soft"
                >
                  <FileText className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
                  <div>
                    <p className="text-sm font-semibold text-ensena-ink">{article.title}</p>
                    <p className="mt-0.5 text-xs text-ensena-muted">{article.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
              <span className="flex size-10 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-primary">
                <MessageCircleQuestion className="size-4.5" />
              </span>
              <p className="mt-3 font-heading text-base font-semibold text-ensena-ink">Still need help?</p>
              <p className="mt-1 text-sm text-ensena-muted">
                Can&apos;t find what you&apos;re looking for? Contact Ensena Support and we&apos;ll help you find a
                solution.
              </p>
              <Button
                nativeButton={false}
                render={<Link href={buildSupportHref({ role: "Guest", context: "public" })} />}
                className="mt-4 h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </ContentSection>
    </div>
  );
}
