"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface StudentActionResult {
  ok: boolean;
  message?: string;
}

async function currentStudentId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "student" ? user.id : null;
}

const clean = (list: string[], max = 40) => [...new Set(list.map((s) => s.trim()).filter(Boolean))].slice(0, max);

// Saves the editable parts of the student's profile. Runs as the student
// (RLS: a student may update their own student_profiles row).
export async function saveStudentProfile(input: {
  bio: string;
  subjects: string[];
  supportTypes: string[];
  learningGoals: string[];
}): Promise<StudentActionResult> {
  const id = await currentStudentId();
  if (!id) return { ok: false, message: "Please sign in again." };
  const goals = clean(input.learningGoals, 20).map((g) => g.slice(0, 200));
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("student_profiles")
    .update({
      bio: input.bio.trim().slice(0, 1000) || null,
      subjects: clean(input.subjects),
      support_types: clean(input.supportTypes, 20),
      learning_goals: goals,
      goal: goals[0] ?? null,
    })
    .eq("id", id);
  if (error) {
    // Columns from migration 0014 not created yet.
    if (error.code === "PGRST204" || error.code === "42703") {
      return { ok: false, message: "The database needs updating first: run supabase/migrations/0014_student_profile_details.sql in the Supabase SQL Editor." };
    }
    return { ok: false, message: "We couldn't save your profile. Please try again." };
  }
  revalidatePath("/student-dashboard", "layout");
  return { ok: true };
}

// Saved tutors (public.saved_tutors). Done with the service-role client but
// always for the signed-in student only, and only for real tutor accounts.
export async function setTutorSaved(tutorId: string, saved: boolean): Promise<StudentActionResult> {
  const id = await currentStudentId();
  if (!id) return { ok: false, message: "Please sign in as a student to save tutors." };
  if (!/^[0-9a-f-]{36}$/i.test(tutorId)) return { ok: false, message: "That tutor can't be saved." };
  const admin = getServiceRoleClient();
  if (saved) {
    const { data: tutor } = await admin.from("profiles").select("role").eq("id", tutorId).maybeSingle();
    if (tutor?.role !== "tutor") return { ok: false, message: "That tutor can't be saved." };
    const { error } = await admin.from("saved_tutors").upsert({ student_id: id, tutor_id: tutorId }, { onConflict: "student_id,tutor_id", ignoreDuplicates: true });
    if (error) return { ok: false, message: "We couldn't save that tutor. Please try again." };
  } else {
    const { error } = await admin.from("saved_tutors").delete().eq("student_id", id).eq("tutor_id", tutorId);
    if (error) return { ok: false, message: "We couldn't remove that tutor. Please try again." };
  }
  revalidatePath("/student-dashboard/saved-tutors");
  return { ok: true };
}
