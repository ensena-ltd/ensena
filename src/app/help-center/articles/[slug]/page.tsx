import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { HelpArticleDetailClient } from "@/components/support/help-article-detail-client";
import { buildSupportHref } from "@/lib/support-links";

export const metadata: Metadata = {
  title: "Help Center | Ensena",
};

// No server-side existence gate: articles are admin-managed at runtime
// (help-articles-store.ts), so the server can't check a slug against
// client-side localStorage. HelpArticleDetailClient renders its own
// "This article could not be found" fallback for an invalid slug — same
// pattern as every other hybrid-dataset detail page in this app.
export default async function PublicHelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <HelpArticleDetailClient
          slug={slug}
          audience="Public"
          backHref="/help-center"
          backLabel="Back to Help Center"
          contactSupportHref={buildSupportHref({ role: "Guest", context: "public" })}
          articleBasePath="/help-center/articles"
        />
      </main>
      <Footer />
    </div>
  );
}
