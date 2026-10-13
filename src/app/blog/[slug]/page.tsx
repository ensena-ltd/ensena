import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ArticleLayout } from "@/components/public-pages/article-layout";
import { blogArticles, getBlogArticle } from "@/lib/blog-data";

export function generateStaticParams() {
  return blogArticles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticle(slug);
  if (!article) return { title: "Blog | Ensena" };
  return {
    title: `${article.title} | Ensena Blog`,
    description: article.description,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: { title: article.title, description: article.description, images: [{ url: article.image }] },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getBlogArticle(slug);
  if (!article) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <ArticleLayout
          breadcrumbs={[{ label: "Blog", href: "/blog" }, { label: article.title }]}
          category={article.category}
          title={article.title}
          dateLabel={new Date(article.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          image={article.image}
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
