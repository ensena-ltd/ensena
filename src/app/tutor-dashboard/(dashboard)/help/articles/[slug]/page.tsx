import type { Metadata } from "next";

import { HelpArticleDetailClient } from "@/components/support/help-article-detail-client";
import { buildSupportHref } from "@/lib/support-links";

export const metadata: Metadata = {
  title: "Help Center | Ensena Tutor Dashboard",
};

export default async function TutorHelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <HelpArticleDetailClient
      slug={slug}
      audience="Tutor"
      backHref="/tutor-dashboard/help"
      backLabel="Back to Help Center"
      contactSupportHref={buildSupportHref({ role: "Tutor", context: "tutor" })}
      articleBasePath="/tutor-dashboard/help/articles"
    />
  );
}
