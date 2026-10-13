"use client";

import { createContext, useContext, type ReactNode } from "react";

import { DEFAULT_STUDENT_IMAGE, dashboardStudent, studentProfileDetail } from "@/lib/student-dashboard-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface StudentGuardian {
  fullName: string;
  relationship: string;
  email: string;
  phone: string;
  consentStatus: "pending" | "confirmed";
}

// Who is signed in to the student dashboard. Loaded server-side from
// profiles + student_profiles in the dashboard layout; when Supabase isn't
// configured (demo mode) it falls back to the static dashboardStudent
// persona so the demo keeps working unchanged.
export interface StudentIdentity {
  id: string | null;
  name: string;
  firstName: string;
  email: string;
  phone: string;
  dob: string;
  image: string;
  /** Most specific level we know, e.g. "SS2", "300 Level", "Primary". */
  level: string;
  academicLevel: string;
  academicDetail: string;
  /** Degree course for Undergraduate/Masters/PhD students. */
  course: string;
  learningFor: string;
  subjects: string[];
  goal: string;
  bio: string;
  /** "What do you usually need help with?" (academic-support-types ids). */
  supportTypes: string[];
  learningGoals: string[];
  tier: string;
  /** Parent/guardian for "My child" sign-ups (student_guardians). */
  guardian: StudentGuardian | null;
  /** Real unread message count (conversation_participants); null in demo mode. */
  unreadMessages: number | null;
}

export interface StudentIdentityRow {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  learningFor: string | null;
  academicLevel: string | null;
  academicDetail: string | null;
  course: string | null;
  subjects: string[] | null;
  goal: string | null;
  bio: string | null;
  supportTypes: string[] | null;
  learningGoals: string[] | null;
  guardian: StudentGuardian | null;
  unreadMessages?: number;
}

const demoIdentity: StudentIdentity = {
  id: null,
  name: dashboardStudent.name,
  firstName: dashboardStudent.name.split(" ")[0],
  email: dashboardStudent.email,
  phone: dashboardStudent.phone,
  dob: dashboardStudent.dob,
  image: dashboardStudent.image,
  level: dashboardStudent.level,
  academicLevel: dashboardStudent.level,
  academicDetail: studentProfileDetail.academicLevel,
  course: "",
  learningFor: "Myself",
  subjects: studentProfileDetail.subjects,
  goal: studentProfileDetail.learningGoals[0] ?? "",
  bio: studentProfileDetail.bio,
  supportTypes: studentProfileDetail.supportPreferences,
  learningGoals: studentProfileDetail.learningGoals,
  tier: dashboardStudent.tier,
  guardian: null,
  unreadMessages: null,
};

function toIdentity(row: StudentIdentityRow): StudentIdentity {
  const name = row.fullName.trim() || row.email;
  return {
    id: row.id,
    name,
    firstName: name.split(" ")[0],
    email: row.email,
    phone: row.phone ?? "",
    dob: row.dateOfBirth ?? "",
    image: row.avatarUrl || DEFAULT_STUDENT_IMAGE,
    level: row.academicDetail || row.academicLevel || "",
    academicLevel: row.academicLevel ?? "",
    academicDetail: row.academicDetail ?? "",
    course: row.course ?? "",
    learningFor: row.learningFor ?? "",
    subjects: row.subjects ?? [],
    goal: row.goal ?? "",
    bio: row.bio ?? "",
    supportTypes: row.supportTypes ?? [],
    // Fall back to the single onboarding goal until learning_goals exists/is filled.
    learningGoals: row.learningGoals?.length ? row.learningGoals : (row.goal ?? "").split("\n").filter(Boolean),
    tier: "Student",
    guardian: row.guardian,
    unreadMessages: row.unreadMessages ?? 0,
  };
}

const StudentIdentityContext = createContext<StudentIdentity>(demoIdentity);

export function StudentIdentityProvider({ row, children }: { row: StudentIdentityRow | null; children: ReactNode }) {
  return <StudentIdentityContext.Provider value={row ? toIdentity(row) : demoIdentity}>{children}</StudentIdentityContext.Provider>;
}

export function useStudentIdentity() {
  return useContext(StudentIdentityContext);
}

// Persists edits from the Profile/Settings pages. RLS only lets a student
// update their own rows. Callers should router.refresh() afterwards so the
// layout re-reads the identity. No-op for the demo persona (id null).
export async function saveStudentIdentity(
  id: string | null,
  changes: {
    profile?: { phone?: string | null; date_of_birth?: string | null };
    student?: { phone?: string | null; date_of_birth?: string | null; academic_detail?: string | null; subjects?: string[]; goal?: string | null };
    guardian?: { full_name?: string; phone?: string };
  }
): Promise<{ ok: boolean }> {
  if (!id) return { ok: true };
  const supabase = getSupabaseBrowserClient();
  const results = await Promise.all([
    changes.profile ? supabase.from("profiles").update(changes.profile).eq("id", id) : null,
    changes.student ? supabase.from("student_profiles").update(changes.student).eq("id", id) : null,
    changes.guardian ? supabase.from("student_guardians").update(changes.guardian).eq("student_id", id) : null,
  ]);
  return { ok: results.every((r) => !r?.error) };
}
