import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminTutorVerificationReviewClient } from "@/components/admin/admin-tutor-verification-review-client";
import { TutorReview } from "@/components/admin/real/tutor-review";
import { loadTutor } from "@/lib/admin-registrations";
import { initialAdminTutors } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (isSupabaseConfigured()) {
    const tutor = await loadTutor(id);
    return { title: tutor ? `Verify ${tutor.fullName} | Ensena Admin` : "Tutor Verification | Ensena Admin" };
  }
  const tutor = initialAdminTutors.find((t) => t.id === id);
  return { title: tutor ? `Verify ${tutor.name} | Ensena Admin` : "Tutor Verification | Ensena Admin" };
}

export default async function AdminTutorVerificationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSupabaseConfigured()) {
    const tutor = await loadTutor(id);
    if (!tutor) notFound();
    return <TutorReview tutor={tutor} backHref="/admin/verification" />;
  }
  return <AdminTutorVerificationReviewClient tutorId={id} />;
}
