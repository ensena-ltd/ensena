"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";

import { PublicPageHero } from "@/components/public-pages/public-page-hero";
import { ContentSection } from "@/components/public-pages/content-section";
import { EmptyState } from "@/components/public-pages/empty-state";
import { blogArticles, blogCategories, type BlogCategory } from "@/lib/blog-data";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function BlogClient() {
  const [activeCategory, setActiveCategory] = useState<BlogCategory | "All">("All");

  const filtered = useMemo(
    () => (activeCategory === "All" ? blogArticles : blogArticles.filter((a) => a.category === activeCategory)),
    [activeCategory]
  );

  const [featured, ...rest] = filtered;

  return (
    <div>
      <PublicPageHero
        title="The Ensena Blog"
        subtitle="Practical guidance on learning, exams and tutoring, written for students, parents and tutors in Nigeria."
      />

      <ContentSection>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("All")}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              activeCategory === "All" ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
            )}
          >
            All
          </button>
          {blogCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                activeCategory === category ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={Newspaper}
              title="No articles published yet"
              description="We're working on articles about learning, exams and tutoring. Check back soon."
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            {featured && (
              <Link href={`/blog/${featured.slug}`} className="group grid grid-cols-1 gap-5 overflow-hidden rounded-2xl border border-ensena-border sm:grid-cols-2">
                <div className="relative aspect-[16/10] sm:aspect-auto">
                  <Image src={featured.image} alt="" fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
                </div>
                <div className="flex flex-col justify-center p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">{featured.category}</p>
                  <p className="mt-2 font-heading text-xl font-semibold text-ensena-ink group-hover:underline">{featured.title}</p>
                  <p className="mt-2 text-sm text-ensena-muted">{featured.description}</p>
                  <p className="mt-4 text-xs text-ensena-muted">{formatDate(featured.publishedAt)}</p>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((article) => (
                  <Link key={article.slug} href={`/blog/${article.slug}`} className="group overflow-hidden rounded-2xl border border-ensena-border">
                    <div className="relative aspect-[16/10]">
                      <Image src={article.image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">{article.category}</p>
                      <p className="mt-1.5 text-sm font-semibold text-ensena-ink group-hover:underline">{article.title}</p>
                      <p className="mt-1 text-xs text-ensena-muted">{article.description}</p>
                      <p className="mt-3 text-[11px] text-ensena-muted">{formatDate(article.publishedAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </ContentSection>
    </div>
  );
}
