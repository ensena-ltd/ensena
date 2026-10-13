// Server-only: what a tutor is allowed to see of a student's profile.
// A tutor can view it when the student turned on "Public Profile"
// (Settings → Privacy), or when the two already have a booking together
// (a private lesson or discovery session) — tutors need to know who
// they're teaching. Otherwise the profile is private. Uses the service-role
// client because RLS doesn't let a tutor read other people's rows; access
// is decided here.
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { loadReviewsAboutStudent, type StudentReview } from "@/lib/student-profile-server";

export interface StudentPublicProfile {
  id: string;
  name: string;
  image: string | null;
  academicLevel: string;
  academicDetail: string;
  course: string;
  subjects: string[];
  bio: string;
  goal: string;
  learningGoals: string[];
  supportTypes: string[];
  memberSince: string;
  reviews: StudentReview[];
  /** Why the tutor can see it. */
  access: "public" | "booked";
}

export type StudentProfileLookup = { status: "ok"; profile: StudentPublicProfile } | { status: "private"; firstName: string } | { status: "not-found" };

/** Whether the student is (or was) enrolled in one of the tutor's group classes. */
export async function inTutorsGroupClass(tutorId: string, studentId: string): Promise<boolean> {
  const admin = getServiceRoleClient();
  const { data: classes } = await admin.from("group_classes").select("id").eq("tutor_id", tutorId);
  const classIds = (classes ?? []).map((c) => c.id as string);
  if (!classIds.length) return false;
  const { data: cohorts } = await admin.from("group_class_cohorts").select("id").in("group_class_id", classIds);
  const cohortIds = (cohorts ?? []).map((c) => c.id as string);
  if (!cohortIds.length) return false;
  const { count } = await admin.from("group_class_enrollments").select("id", { count: "exact", head: true }).in("cohort_id", cohortIds).eq("student_id", studentId).neq("status", "Waitlisted");
  return (count ?? 0) > 0;
}

export async function loadStudentProfileForTutor(tutorId: string, studentId: string): Promise<StudentProfileLookup> {
  const admin = getServiceRoleClient();
  const [{ data: person }, { data: student }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email, avatar_url, role, created_at").eq("id", studentId).maybeSingle(),
    admin.from("student_profiles").select("*").eq("id", studentId).maybeSingle(),
  ]);
  if (!person || person.role !== "student" || !student) return { status: "not-found" };

  const name = person.full_name?.trim() || "Student";
  let access: StudentPublicProfile["access"] | null = student.profile_public === true ? "public" : null;
  if (!access) {
    const [{ count: lessons }, { count: discovery }] = await Promise.all([
      admin.from("private_lessons").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId).eq("student_id", studentId),
      admin.from("discovery_sessions").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId).eq("student_id", studentId),
    ]);
    if ((lessons ?? 0) + (discovery ?? 0) > 0) access = "booked";
    else if (await inTutorsGroupClass(tutorId, studentId)) access = "booked";
  }
  if (!access) return { status: "private", firstName: name.split(" ")[0] };

  return {
    status: "ok",
    profile: {
      id: person.id,
      name,
      image: person.avatar_url ?? null,
      academicLevel: student.academic_level ?? "",
      academicDetail: student.academic_detail ?? "",
      course: student.course ?? "",
      subjects: student.subjects ?? [],
      bio: student.bio ?? "",
      goal: student.goal ?? "",
      learningGoals: student.learning_goals ?? [],
      supportTypes: student.support_types ?? [],
      memberSince: person.created_at,
      reviews: await loadReviewsAboutStudent(studentId),
      access,
    },
  };
}
