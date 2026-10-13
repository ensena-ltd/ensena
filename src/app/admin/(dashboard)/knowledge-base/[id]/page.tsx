import type { Metadata } from "next";

import { AdminKnowledgeBaseEditorClient } from "@/components/admin/admin-knowledge-base-editor-client";

export const metadata: Metadata = {
  title: "Edit Article | Ensena Admin",
};

// No server-side existence gate: articles (including ones created at
// runtime) only exist in the client's shared localStorage store — the
// editor's own "This article could not be found" fallback handles an
// invalid id, same pattern as every other hybrid-dataset detail page here.
export default async function AdminEditKnowledgeBaseArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminKnowledgeBaseEditorClient articleId={id} />;
}
