import type { Metadata } from "next";

import { HelpArticleDetailClient } from "@/components/support/help-article-detail-client";
import { buildSupportHref } from "@/lib/support-links";

export const metadata: Metadata = {
  title: "Help Center | Ensena Student Dashboard",
};

export default async function StudentHelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <HelpArticleDetailClient
      slug={slug}
      audience="Student"
      backHref="/student-dashboard/help"
      backLabel="Back to Help Center"
      contactSupportHref={buildSupportHref({ role: "Student", context: "student" })}
      articleBasePath="/student-dashboard/help/articles"
    />
  );
}
