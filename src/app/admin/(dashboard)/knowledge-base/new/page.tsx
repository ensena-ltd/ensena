import type { Metadata } from "next";

import { AdminKnowledgeBaseEditorClient } from "@/components/admin/admin-knowledge-base-editor-client";

export const metadata: Metadata = {
  title: "New Article | Ensena Admin",
};

export default function AdminNewKnowledgeBaseArticlePage() {
  return <AdminKnowledgeBaseEditorClient />;
}
