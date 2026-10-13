"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { HelpCenterClient } from "@/components/support/help-center-client";
import { usePublishedHelpArticles } from "@/hooks/use-help-articles";
import { SUPPORT_CONTEXT_LABELS, type RelatedRecordType, type SupportContext } from "@/lib/support-data";
import { buildSupportHref } from "@/lib/support-links";
import { faqItems } from "@/lib/tutor-dashboard-data";

const TUTOR_CONTEXTS: SupportContext[] = ["tutor", "booking", "group-class", "payment", "payout", "account", "technical"];

export function TutorHelpCenterClient() {
  const searchParams = useSearchParams();
  const contextParam = searchParams.get("context") as SupportContext | null;
  const context: SupportContext = contextParam && TUTOR_CONTEXTS.includes(contextParam) ? contextParam : "tutor";
  const relatedRecordType = searchParams.get("relatedRecordType") as RelatedRecordType | null;
  const relatedRecordId = searchParams.get("relatedRecordId") ?? undefined;
  const relatedRecordLabel = searchParams.get("relatedRecordLabel") ?? undefined;
  const presetCategory = searchParams.get("category") ?? undefined;
  const [highlightActive, setHighlightActive] = useState(!!contextParam && context !== "tutor");
  const knowledgeBaseArticles = usePublishedHelpArticles("Tutor");

  return (
    <HelpCenterClient
      faqItems={faqItems}
      knowledgeBaseTitle="Knowledge Base"
      knowledgeBaseArticles={knowledgeBaseArticles}
      articleHrefFor={(slug) => `/tutor-dashboard/help/articles/${slug}`}
      contactSupportHref={buildSupportHref({
        role: "Tutor",
        context,
        relatedRecordType: relatedRecordType ?? undefined,
        relatedRecordId,
        relatedRecordLabel,
        category: presetCategory,
      })}
      reportIssueHref={buildSupportHref({ role: "Tutor", context: "tutor", category: "Technical Support", source: "Report" })}
      viewRequestsHref="/tutor-dashboard/support"
      highlightContext={highlightActive ? context : undefined}
      highlightLabel={SUPPORT_CONTEXT_LABELS[context]}
      onClearHighlight={() => setHighlightActive(false)}
    />
  );
}
