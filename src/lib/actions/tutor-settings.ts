"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Writes behind the tutor's Settings (Privacy, Calendar), Profile
// (Availability) and Reviews pages. Each re-checks the signed-in user is a
// tutor whose session has passed two-step verification when they use it,
// then writes only that tutor's own rows with the service-role client.

export interface TutorSettingsResult {
  ok: boolean;
  message?: string;
  id?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DURATIONS = [30, 45, 60, 90];

async function currentTutorId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "tutor" ? user.id : null;
}

const SIGN_IN_AGAIN = { ok: false, message: "Please sign in again." } as const;

function refreshTutorPages() {
  revalidatePath("/tutor-dashboard", "layout");
  revalidatePath("/student-dashboard", "layout");
}

// ── Privacy ────────────────────────────────────────────────────────────

export async function updateTutorPrivacy(patch: { profilePublic?: boolean; showLastActive?: boolean; allowNewStudentMessages?: boolean }): Promise<TutorSettingsResult> {
  const tutorId = await currentTutorId();
  if (!tutorId) return SIGN_IN_AGAIN;
  const row: Record<string, boolean> = {};
  if (typeof patch.profilePublic === "boolean") row.profile_public = patch.profilePublic;
  if (typeof patch.showLastActive === "boolean") row.show_last_active = patch.showLastActive;
  if (typeof patch.allowNewStudentMessages === "boolean") row.allow_new_student_messages = patch.allowNewStudentMessages;
  if (!Object.keys(row).length) return { ok: true };
  const { error } = await getServiceRoleClient().from("tutor_profiles").update(row).eq("id", tutorId);
  if (error) return { ok: false, message: "We couldn't save your privacy settings." };
  refreshTutorPages();
  return { ok: true };
}

// ── Calendar ───────────────────────────────────────────────────────────

export async function updateDefaultLessonDuration(minutes: number): Promise<TutorSettingsResult> {
  const tutorId = await currentTutorId();
  if (!tutorId) return SIGN_IN_AGAIN;
  if (!DURATIONS.includes(minutes)) return { ok: false, message: "Pick 30, 45, 60 or 90 minutes." };
  // Only this column is sent, so the row's other settings are left as they are.
  const { error } = await getServiceRoleClient()
    .from("account_settings")
    .upsert({ user_id: tutorId, default_lesson_duration: minutes, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, message: "We couldn't save your default lesson length." };
  refreshTutorPages();
  return { ok: true };
}

// ── Availability ───────────────────────────────────────────────────────

export interface WeeklyDayInput {
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number;
  enabled: boolean;
  /** "HH:MM", 24-hour, platform time (Africa/Lagos). */
  start: string;
  end: string;
}

export async function saveTutorAvailability(input: { days: WeeklyDayInput[]; vacationMode: boolean }): Promise<TutorSettingsResult> {
  const tutorId = await currentTutorId();
  if (!tutorId) return SIGN_IN_AGAIN;
  const days = input.days.filter((d) => Number.isInteger(d.dayOfWeek) && d.dayOfWeek >= 0 && d.dayOfWeek <= 6);
  if (days.length !== 7 || new Set(days.map((d) => d.dayOfWeek)).size !== 7) return { ok: false, message: "Something went wrong with your weekly hours. Please reload and try again." };
  for (const d of days) {
    if (!HHMM.test(d.start) || !HHMM.test(d.end)) return { ok: false, message: "Enter a start and end time for every available day." };
    if (d.enabled && d.end <= d.start) return { ok: false, message: "Each day's end time must be after its start time." };
  }

  const admin = getServiceRoleClient();
  const [{ error: hoursError }, { error: vacationError }] = await Promise.all([
    admin
      .from("tutor_weekly_availability")
      .upsert(
        days.map((d) => ({ tutor_id: tutorId, day_of_week: d.dayOfWeek, enabled: d.enabled, start_time: d.start, end_time: d.end })),
        { onConflict: "tutor_id,day_of_week" }
      ),
    admin.from("tutor_profiles").update({ vacation_mode: input.vacationMode === true }).eq("id", tutorId),
  ]);
  if (hoursError || vacationError) return { ok: false, message: "We couldn't save your availability. Please try again." };
  refreshTutorPages();
  return { ok: true };
}

export async function addTutorBlockedTime(input: { startMs: number; endMs: number; reason?: string }): Promise<TutorSettingsResult> {
  const tutorId = await currentTutorId();
  if (!tutorId) return SIGN_IN_AGAIN;
  const { startMs, endMs } = input;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return { ok: false, message: "The end must be after the start." };
  if (endMs < Date.now()) return { ok: false, message: "That time has already passed." };
  if (endMs - startMs > 90 * 86_400_000) return { ok: false, message: "Block at most 90 days at a time — use Vacation Mode for longer breaks." };
  const { data, error } = await getServiceRoleClient()
    .from("tutor_blocked_time")
    .insert({ tutor_id: tutorId, start_at: new Date(startMs).toISOString(), end_at: new Date(endMs).toISOString(), reason: input.reason?.trim().slice(0, 120) || null })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "We couldn't block that time." };
  refreshTutorPages();
  return { ok: true, id: data.id };
}

export async function removeTutorBlockedTime(id: string): Promise<TutorSettingsResult> {
  const tutorId = await currentTutorId();
  if (!tutorId) return SIGN_IN_AGAIN;
  if (!UUID.test(id)) return { ok: false, message: "That blocked time no longer exists." };
  const { error } = await getServiceRoleClient().from("tutor_blocked_time").delete().eq("id", id).eq("tutor_id", tutorId);
  if (error) return { ok: false, message: "We couldn't remove that blocked time." };
  refreshTutorPages();
  return { ok: true };
}

// ── Reviews ────────────────────────────────────────────────────────────

export async function replyToStudentReview(reviewId: string, reply: string): Promise<TutorSettingsResult> {
  const tutorId = await currentTutorId();
  if (!tutorId) return SIGN_IN_AGAIN;
  if (!UUID.test(reviewId)) return { ok: false, message: "That review no longer exists." };
  const text = reply.trim().slice(0, 1000);
  if (text.length < 2) return { ok: false, message: "Write a reply first." };
  const { data, error } = await getServiceRoleClient()
    .from("reviews")
    .update({ tutor_reply: text, updated_at: new Date().toISOString() })
    .eq("id", reviewId)
    .eq("recipient_id", tutorId)
    .eq("direction", "student_to_tutor")
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "We couldn't post your reply." };
  refreshTutorPages();
  return { ok: true };
}

export async function reportStudentReview(reviewId: string, reason: string, details: string): Promise<TutorSettingsResult> {
  const tutorId = await currentTutorId();
  if (!tutorId) return SIGN_IN_AGAIN;
  if (!UUID.test(reviewId)) return { ok: false, message: "That review no longer exists." };
  const text = [reason.trim(), details.trim()].filter(Boolean).join(" — ").slice(0, 1000);
  if (!text) return { ok: false, message: "Tell us why you're reporting this review." };
  const { data, error } = await getServiceRoleClient()
    .from("reviews")
    .update({ reported: true, report_reason: text, updated_at: new Date().toISOString() })
    .eq("id", reviewId)
    .eq("recipient_id", tutorId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "We couldn't send your report." };
  refreshTutorPages();
  return { ok: true };
}
