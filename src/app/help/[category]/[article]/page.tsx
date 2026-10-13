import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ArticleLayout } from "@/components/public-pages/article-layout";
import { findHelpArticle, findHelpCategory, helpCategories } from "@/lib/help-center-data";

export function generateStaticParams() {
  return helpCategories.flatMap((c) => c.articles.map((a) => ({ category: c.slug, article: a.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; article: string }>;
}): Promise<Metadata> {
  const { category, article } = await params;
  const helpArticle = findHelpArticle(category, article);
  if (!helpArticle) return { title: "Help Center | Ensena" };
  return {
    title: `${helpArticle.title} | Ensena Help Center`,
    description: helpArticle.summary,
    alternates: { canonical: `/help/${category}/${article}` },
  };
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ category: string; article: string }>;
}) {
  const { category: categorySlug, article: articleSlug } = await params;
  const category = findHelpCategory(categorySlug);
  const article = findHelpArticle(categorySlug, articleSlug);
  if (!category || !article) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <ArticleLayout
          breadcrumbs={[
            { label: "Help Center", href: "/help" },
            { label: category.title, href: `/help/${category.slug}` },
            { label: article.title },
          ]}
          category={category.title}
          title={article.title}
        >
          {article.content.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </ArticleLayout>
      </main>
      <Footer />
    </div>
  );
}
