import type { Metadata } from "next";

import { AdminKnowledgeBasePreviewClient } from "@/components/admin/admin-knowledge-base-preview-client";

export const metadata: Metadata = {
  title: "Preview Article | Ensena Admin",
};

export default async function AdminKnowledgeBaseArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminKnowledgeBasePreviewClient articleId={id} />;
}
