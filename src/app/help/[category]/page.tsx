import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileText } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Breadcrumbs } from "@/components/public-pages/breadcrumbs";
import { EmptyState } from "@/components/public-pages/empty-state";
import { findHelpCategory, helpCategories } from "@/lib/help-center-data";

export function generateStaticParams() {
  return helpCategories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = findHelpCategory(slug);
  if (!category) return { title: "Help Center | Ensena" };
  return {
    title: `${category.title} | Ensena Help Center`,
    description: category.description,
    alternates: { canonical: `/help/${category.slug}` },
  };
}

export default async function HelpCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = findHelpCategory(slug);
  if (!category) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-[800px] px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: "Help Center", href: "/help" }, { label: category.title }]} />

          <div className="mt-5 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-primary">
              <category.icon className="size-5" />
            </span>
            <div>
              <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{category.title}</h1>
              <p className="text-sm text-ensena-muted">{category.description}</p>
            </div>
          </div>

          <div className="mt-8">
            {category.articles.length === 0 ? (
              <EmptyState icon={FileText} title="No articles yet" description="We're still writing help articles for this category." />
            ) : (
              <div className="flex flex-col divide-y divide-ensena-border rounded-2xl border border-ensena-border">
                {category.articles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/help/${category.slug}/${article.slug}`}
                    className="group flex items-center justify-between gap-4 p-4 hover:bg-ensena-bg-soft"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ensena-ink">{article.title}</p>
                      <p className="mt-0.5 text-xs text-ensena-muted">{article.summary}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-ensena-muted transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
