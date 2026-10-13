"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { SupportRequestForm } from "@/components/support/support-request-form";
import { GUEST_CONTEXTS, type RelatedRecordType, type SupportContext, type SupportSource } from "@/lib/support-data";
import { resolveRelatedRecord } from "@/lib/support-related-record";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function SupportNewPublicClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contextParam = searchParams.get("context") as SupportContext | null;
  const context: SupportContext = contextParam && GUEST_CONTEXTS.includes(contextParam) ? contextParam : "public";
  const relatedRecordType = searchParams.get("relatedRecordType") as RelatedRecordType | null;
  const relatedRecordId = searchParams.get("relatedRecordId");
  const relatedRecordLabel = searchParams.get("relatedRecordLabel");
  const presetCategory = searchParams.get("category") ?? undefined;
  const source = (searchParams.get("source") as SupportSource | null) ?? undefined;

  const live = isSupabaseConfigured();
  const related = live
    ? relatedRecordType && relatedRecordId && relatedRecordLabel
      ? { type: relatedRecordType, id: relatedRecordId, label: relatedRecordLabel, lines: [] }
      : undefined
    : resolveRelatedRecord(relatedRecordType, relatedRecordId, relatedRecordLabel);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
      <SupportRequestForm
        context={context}
        userRole="Guest"
        userName="Guest"
        related={related}
        presetCategory={presetCategory}
        source={source}
        live={live}
        onSubmitted={(id) => router.push(`/support/${id}`)}
      />
    </div>
  );
}
