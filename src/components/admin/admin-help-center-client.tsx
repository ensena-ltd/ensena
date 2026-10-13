"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { HelpCenterClient } from "@/components/support/help-center-client";
import { useAdminSession } from "@/hooks/use-admin-session";
import { usePublishedHelpArticles } from "@/hooks/use-help-articles";
import { adminFaqItems } from "@/lib/admin-help-content";
import { canAccessSection } from "@/lib/admin-session";
import { allSections } from "@/lib/admin-permissions-data";
import { buildSupportHref } from "@/lib/support-links";

const ADMIN_SECTION_KEYS = new Set(allSections.map((s) => s.key));

export function AdminHelpCenterClient() {
  const session = useAdminSession();
  const searchParams = useSearchParams();
  const presetCategory = searchParams.get("category") ?? undefined;

  // Only show FAQ items about areas this staff member can actually open —
  // an item with no admin-section tag (or only a highlight-context tag
  // like "payout") is left visible to everyone, since it isn't gated.
  const visibleFaqItems = useMemo(
    () =>
      adminFaqItems.filter((f) => {
        const sectionTags = f.tags?.filter((t) => ADMIN_SECTION_KEYS.has(t)) ?? [];
        return sectionTags.length === 0 || sectionTags.some((t) => canAccessSection(session, t));
      }),
    [session]
  );

  const knowledgeBaseArticles = usePublishedHelpArticles("Admin");

  return (
    <HelpCenterClient
      faqItems={visibleFaqItems}
      knowledgeBaseTitle="Admin Resources"
      knowledgeBaseArticles={knowledgeBaseArticles}
      articleHrefFor={(slug) => `/admin/help/articles/${slug}`}
      contactSupportHref={buildSupportHref({ role: "Admin", context: "platform-staff", category: presetCategory })}
      reportIssueHref={buildSupportHref({ role: "Admin", context: "platform-staff", category: "System / technical issue", source: "Report" })}
      viewRequestsHref="/admin/support?tab=My Requests"
      liveChat={false}
    />
  );
}
