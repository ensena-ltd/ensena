import type { Metadata } from "next";

import { HelpArticleDetailClient } from "@/components/support/help-article-detail-client";
import { buildSupportHref } from "@/lib/support-links";

export const metadata: Metadata = {
  title: "Help Center | Ensena Admin",
};

export default async function AdminHelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <HelpArticleDetailClient
      slug={slug}
      audience="Admin"
      backHref="/admin/help"
      backLabel="Back to Help Center"
      contactSupportHref={buildSupportHref({ role: "Admin", context: "platform-staff" })}
      articleBasePath="/admin/help/articles"
    />
  );
}
