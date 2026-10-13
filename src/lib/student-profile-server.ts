// Server-only loaders for the student's Profile and Saved Tutors pages.
// Review authors and saved tutors are other people's profiles, which RLS
// doesn't let a student read directly — so these use the service-role
// client, always filtered to the signed-in student's own rows.
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { normalizeTutorStatus, parseTutorApplication, type TutorApplicationStatus } from "@/lib/tutor-application";

export interface StudentReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName: string;
  reviewerImage: string | null;
}

export interface SavedTutorCard {
  tutorId: string;
  name: string;
  image: string | null;
  headline: string;
  subjects: string[];
  levels: string[];
  pricePerHour: string;
  country: string;
  status: TutorApplicationStatus;
  savedAt: string;
}

export async function loadReviewsAboutStudent(studentId: string): Promise<StudentReview[]> {
  try {
    const admin = getServiceRoleClient();
    const { data } = await admin
      .from("reviews")
      .select("id, direction, reviewer_id, rating, comment, status, created_at")
      .eq("recipient_id", studentId)
      .order("created_at", { ascending: false });
    const rows = ((data ?? []) as { id: string; direction: string; reviewer_id: string; rating: number; comment: string | null; status: string | null; created_at: string }[]).filter(
      (r) => /tutor.*student/i.test(r.direction) && r.status !== "hidden" && r.status !== "removed"
    );
    if (rows.length === 0) return [];
    const { data: people } = await admin.from("profiles").select("id, full_name, email, avatar_url").in("id", [...new Set(rows.map((r) => r.reviewer_id))]);
    return rows.map((r) => {
      const p = (people as { id: string; full_name: string | null; email: string; avatar_url: string | null }[] | null)?.find((x) => x.id === r.reviewer_id);
      return { id: r.id, rating: r.rating, comment: r.comment ?? "", createdAt: r.created_at, reviewerName: p?.full_name?.trim() || "A tutor", reviewerImage: p?.avatar_url ?? null };
    });
  } catch {
    return [];
  }
}

export async function loadSavedTutors(studentId: string): Promise<SavedTutorCard[]> {
  try {
    const admin = getServiceRoleClient();
    const { data: saved } = await admin.from("saved_tutors").select("tutor_id, created_at").eq("student_id", studentId).order("created_at", { ascending: false });
    const rows = (saved ?? []) as { tutor_id: string; created_at: string }[];
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.tutor_id);
    const [{ data: people }, { data: tutors }] = await Promise.all([
      admin.from("profiles").select("id, full_name, email, avatar_url").in("id", ids),
      admin.from("tutor_profiles").select("id, application_status, application_data").in("id", ids),
    ]);
    return rows.flatMap((r) => {
      const p = (people as { id: string; full_name: string | null; email: string; avatar_url: string | null }[] | null)?.find((x) => x.id === r.tutor_id);
      const t = (tutors as { id: string; application_status: string; application_data: Record<string, unknown> | null }[] | null)?.find((x) => x.id === r.tutor_id);
      if (!p || !t) return [];
      const app = parseTutorApplication(t.application_data);
      return [
        {
          tutorId: r.tutor_id,
          name: p.full_name?.trim() || "Tutor",
          image: p.avatar_url,
          headline: app.headline,
          subjects: app.subjects,
          levels: app.levels,
          pricePerHour: app.oneOnOnePrice,
          country: [app.stateCity, app.country].filter(Boolean).join(", "),
          status: normalizeTutorStatus(t.application_status),
          savedAt: r.created_at,
        },
      ];
    });
  } catch {
    return [];
  }
}
