"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { HelpCenterClient } from "@/components/support/help-center-client";
import { usePublishedHelpArticles } from "@/hooks/use-help-articles";
import { publicFaqItems } from "@/lib/public-help-content";
import { GUEST_CONTEXTS, SUPPORT_CONTEXT_LABELS, type RelatedRecordType, type SupportContext } from "@/lib/support-data";
import { buildSupportHref } from "@/lib/support-links";

// The public/unauthenticated Help Center — reached from the landing page,
// sign-in, sign-up, and tutor sign-up's "Contact Support" (all of which now
// open this first instead of the ticket form directly; see
// buildContactSupportHref). Whatever context/related-record info those
// pages already knew still travels through as query params, so "Submit a
// Ticket" below lands on the exact same pre-filled form as before.
export function PublicHelpCenterClient() {
  const searchParams = useSearchParams();
  const contextParam = searchParams.get("context") as SupportContext | null;
  const context: SupportContext = contextParam && GUEST_CONTEXTS.includes(contextParam) ? contextParam : "public";
  const relatedRecordType = searchParams.get("relatedRecordType") as RelatedRecordType | null;
  const relatedRecordId = searchParams.get("relatedRecordId") ?? undefined;
  const relatedRecordLabel = searchParams.get("relatedRecordLabel") ?? undefined;
  const presetCategory = searchParams.get("category") ?? undefined;
  // "public" is the fallback for "no specific signal" — only a real,
  // narrower context (account, tutor-signup, payment, booking, technical)
  // is worth highlighting FAQs for.
  const [highlightActive, setHighlightActive] = useState(!!contextParam && context !== "public");
  const knowledgeBaseArticles = usePublishedHelpArticles("Public");

  return (
    <HelpCenterClient
      faqItems={publicFaqItems}
      knowledgeBaseTitle="Knowledge Base"
      knowledgeBaseArticles={knowledgeBaseArticles}
      articleHrefFor={(slug) => `/help-center/articles/${slug}`}
      contactSupportHref={buildSupportHref({
        role: "Guest",
        context,
        relatedRecordType: relatedRecordType ?? undefined,
        relatedRecordId,
        relatedRecordLabel,
        category: presetCategory,
      })}
      reportIssueHref={buildSupportHref({ role: "Guest", context: "technical" })}
      highlightContext={highlightActive && context !== "public" ? context : undefined}
      highlightLabel={SUPPORT_CONTEXT_LABELS[context]}
      onClearHighlight={() => setHighlightActive(false)}
    />
  );
}
