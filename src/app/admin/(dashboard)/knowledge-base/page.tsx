import type { Metadata } from "next";

import { AdminKnowledgeBaseClient } from "@/components/admin/admin-knowledge-base-client";

export const metadata: Metadata = {
  title: "Knowledge Base | Ensena Admin",
};

export default function AdminKnowledgeBasePage() {
  return <AdminKnowledgeBaseClient />;
}
