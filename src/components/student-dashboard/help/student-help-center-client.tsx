"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { HelpCenterClient } from "@/components/support/help-center-client";
import { usePublishedHelpArticles } from "@/hooks/use-help-articles";
import { SUPPORT_CONTEXT_LABELS, type RelatedRecordType, type SupportContext } from "@/lib/support-data";
import { buildSupportHref } from "@/lib/support-links";
import { studentFaqItems } from "@/lib/student-dashboard-data";

const STUDENT_CONTEXTS: SupportContext[] = ["student", "booking", "group-class", "payment", "counselling", "account", "technical"];

export function StudentHelpCenterClient() {
  const searchParams = useSearchParams();
  const contextParam = searchParams.get("context") as SupportContext | null;
  const context: SupportContext = contextParam && STUDENT_CONTEXTS.includes(contextParam) ? contextParam : "student";
  const relatedRecordType = searchParams.get("relatedRecordType") as RelatedRecordType | null;
  const relatedRecordId = searchParams.get("relatedRecordId") ?? undefined;
  const relatedRecordLabel = searchParams.get("relatedRecordLabel") ?? undefined;
  const presetCategory = searchParams.get("category") ?? undefined;
  const [highlightActive, setHighlightActive] = useState(!!contextParam && context !== "student");
  const knowledgeBaseArticles = usePublishedHelpArticles("Student");

  return (
    <HelpCenterClient
      faqItems={studentFaqItems}
      knowledgeBaseTitle="Learning Guides"
      knowledgeBaseArticles={knowledgeBaseArticles}
      articleHrefFor={(slug) => `/student-dashboard/help/articles/${slug}`}
      contactSupportHref={buildSupportHref({
        role: "Student",
        context,
        relatedRecordType: relatedRecordType ?? undefined,
        relatedRecordId,
        relatedRecordLabel,
        category: presetCategory,
      })}
      reportIssueHref={buildSupportHref({ role: "Student", context: "student", category: "Technical Support", source: "Report" })}
      viewRequestsHref="/student-dashboard/support"
      highlightContext={highlightActive ? context : undefined}
      highlightLabel={SUPPORT_CONTEXT_LABELS[context]}
      onClearHighlight={() => setHighlightActive(false)}
    />
  );
}
