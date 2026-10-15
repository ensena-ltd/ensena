import type { Metadata } from "next";

import { StudentPromotionsClient, type StudentPromotion } from "@/components/student-dashboard/promotions/student-promotions-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Promotions & Offers | Ensena Student Dashboard",
};

// Campaigns that are live right now (row-level security only returns those).
export default async function StudentPromotionsPage() {
  let promotions: StudentPromotion[] = [];
  if (isSupabaseConfigured()) {
    const profile = await requireRole("student");
    if (profile) {
      const supabase = await getSupabaseServerClient();
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("promotions")
        .select("id, title, description, code, discount_type, discount_value, applies_to, ends_at")
        .eq("active", true)
        .lte("starts_at", nowIso)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order("ends_at", { ascending: true, nullsFirst: false });
      promotions = ((data ?? []) as Record<string, unknown>[]).map((p) => ({
        id: p.id as string,
        title: p.title as string,
        description: (p.description as string | null) ?? "",
        code: (p.code as string | null) ?? null,
        discountType: p.discount_type as StudentPromotion["discountType"],
        discountValue: Number(p.discount_value) || 0,
        appliesTo: p.applies_to as StudentPromotion["appliesTo"],
        endsAt: (p.ends_at as string | null) ?? null,
      }));
    }
  }
  return <StudentPromotionsClient promotions={promotions} />;
}
