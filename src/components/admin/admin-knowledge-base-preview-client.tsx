"use client";

import Link from "next/link";

import { HelpArticleView } from "@/components/support/help-article-detail-client";
import { useHelpArticles } from "@/hooks/use-help-articles";

// Admin's own preview — reads the article by id regardless of status, so a
// Draft can be previewed exactly as it will look once published, using the
// same rendering every real Help Center uses. Related articles and the
// Contact Support link stay live (admin's own Help Center), but this page
// itself is never reachable from outside Admin.
export function AdminKnowledgeBasePreviewClient({ articleId }: { articleId: string }) {
  const articles = useHelpArticles();
  const article = articles.find((a) => a.id === articleId);

  if (!article) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This article could not be found.</p>
        <Link href="/admin/knowledge-base" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">
          ← Back to Knowledge Base
        </Link>
      </div>
    );
  }

  const related = articles.filter((a) => a.id !== article.id && a.category === article.category && a.status === "Published").slice(0, 3);

  return (
    <div>
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        Preview mode. This is how the article looks to {article.audience === "All" ? "everyone" : `the ${article.audience} audience`}. Status: <span className="font-semibold">{article.status}</span>.
      </div>
      <HelpArticleView
        article={article}
        related={related}
        backHref="/admin/knowledge-base"
        backLabel="Back to Knowledge Base"
        contactSupportHref="/admin/help"
        articleBasePath="/admin/knowledge-base"
        relatedHrefFor={(a) => `/admin/knowledge-base/${a.id}/preview`}
      />
    </div>
  );
}
