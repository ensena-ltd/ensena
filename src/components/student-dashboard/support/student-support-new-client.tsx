"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { SupportRequestForm } from "@/components/support/support-request-form";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { resolveRelatedRecord } from "@/lib/support-related-record";
import type { RelatedRecordType, SupportContext, SupportSource } from "@/lib/support-data";

const STUDENT_CONTEXTS: SupportContext[] = ["student", "booking", "group-class", "payment", "counselling", "account", "technical"];

export function StudentSupportNewClient({ live = false, userName }: { live?: boolean; userName?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contextParam = searchParams.get("context") as SupportContext | null;
  const context: SupportContext = contextParam && STUDENT_CONTEXTS.includes(contextParam) ? contextParam : "student";
  const relatedRecordType = searchParams.get("relatedRecordType") as RelatedRecordType | null;
  const relatedRecordId = searchParams.get("relatedRecordId");
  const relatedRecordLabel = searchParams.get("relatedRecordLabel");
  const presetCategory = searchParams.get("category") ?? undefined;
  const source = (searchParams.get("source") as SupportSource | null) ?? undefined;

  // The demo resolver reads browser-only records, so live mode only keeps the label.
  const related = live
    ? relatedRecordType && relatedRecordId && relatedRecordLabel
      ? { type: relatedRecordType, id: relatedRecordId, label: relatedRecordLabel, lines: [] }
      : undefined
    : resolveRelatedRecord(relatedRecordType, relatedRecordId, relatedRecordLabel);

  return (
    <SupportRequestForm
      context={context}
      userRole="Student"
      userName={userName ?? dashboardStudent.name}
      live={live}
      related={related}
      presetCategory={presetCategory}
      source={source}
      onSubmitted={(id) => router.push(`/student-dashboard/support/${id}`)}
    />
  );
}
