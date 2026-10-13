import { notFound } from "next/navigation";

import { TutorReview } from "@/components/admin/real/tutor-review";
import { TutorFullDetailsClient } from "@/components/admin/tutor-full-details-client";
import { loadTutor } from "@/lib/admin-registrations";
import { initialAdminTutors } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AdminTutorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSupabaseConfigured()) {
    const tutor = await loadTutor(id);
    if (!tutor) notFound();
    return <TutorReview tutor={tutor} backHref="/admin/tutors" />;
  }
  const tutor = initialAdminTutors.find((t) => t.id === id);
  if (!tutor) notFound();
  return <TutorFullDetailsClient tutorId={id} />;
}
