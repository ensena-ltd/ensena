import type { Metadata } from "next";

import { ReviewsClient } from "@/components/tutor-dashboard/reviews/reviews-client";
import { ReviewsReal } from "@/components/tutor-dashboard/reviews/reviews-real";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorReviews } from "@/lib/tutor-settings-server";

export const metadata: Metadata = {
  title: "Reviews | Ensena Tutor Dashboard",
};

export default async function ReviewsPage() {
  if (!isSupabaseConfigured()) return <ReviewsClient />;
  const profile = await requireRole("tutor");
  if (!profile) return <ReviewsClient />;
  return <ReviewsReal reviews={await loadTutorReviews(profile.id)} />;
}
