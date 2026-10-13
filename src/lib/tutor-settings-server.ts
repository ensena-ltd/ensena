// Server-only: the signed-in tutor's own Settings, Availability and
// Reviews, read with the service-role client and always filtered to
// `tutorId`'s rows (students' names live on profiles, which RLS hides).
import { getAccountSettings } from "@/lib/account-settings";
import { getPreferences, type NotificationPreferences } from "@/lib/notifications";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { loadTutorRegularHours } from "@/lib/tutor-directory-server";
import type { ThemePreference } from "@/lib/theme";

export interface TutorSettingsSnapshot {
  prefs: NotificationPreferences;
  profilePublic: boolean;
  showLastActive: boolean;
  allowNewStudentMessages: boolean;
  loginAlerts: boolean;
  /** null = never saved to the account; fall back to this browser's choice. */
  theme: ThemePreference | null;
  calendarToken: string | null;
  defaultLessonDuration: number;
  /** false for Google-only accounts (they can add a first password). */
  hasPassword: boolean;
}

export interface AvailabilityDay {
  dayOfWeek: number;
  enabled: boolean;
  start: string;
  end: string;
}

export interface BlockedTimeRow {
  id: string;
  startMs: number;
  endMs: number;
  reason: string | null;
}

export interface TutorAvailabilitySnapshot {
  /** Always 7 entries, Sunday (0) … Saturday (6). */
  days: AvailabilityDay[];
  vacationMode: boolean;
  blocked: BlockedTimeRow[];
}

export interface TutorReviewRow {
  id: string;
  rating: number;
  comment: string;
  createdAtMs: number;
  reviewerName: string;
  reviewerImage: string | null;
  bookingType: string | null;
  reply: string | null;
  reported: boolean;
}

export async function loadTutorSettings(tutorId: string, hasPassword: boolean): Promise<TutorSettingsSnapshot> {
  const admin = getServiceRoleClient();
  const [prefs, settings, { data: tutor }, { data: extra }] = await Promise.all([
    getPreferences(tutorId),
    getAccountSettings(tutorId),
    admin.from("tutor_profiles").select("profile_public, show_last_active, allow_new_student_messages").eq("id", tutorId).maybeSingle(),
    admin.from("account_settings").select("default_lesson_duration").eq("user_id", tutorId).maybeSingle(),
  ]);
  return {
    prefs,
    profilePublic: tutor?.profile_public !== false,
    showLastActive: tutor?.show_last_active !== false,
    allowNewStudentMessages: tutor?.allow_new_student_messages !== false,
    loginAlerts: settings.loginAlerts,
    theme: settings.saved ? settings.theme : null,
    calendarToken: settings.calendarToken,
    defaultLessonDuration: Number(extra?.default_lesson_duration) || 60,
    hasPassword,
  };
}

export async function loadTutorAvailability(tutorId: string): Promise<TutorAvailabilitySnapshot> {
  const admin = getServiceRoleClient();
  const [regular, { data: tutor }, { data: blockedRows }] = await Promise.all([
    loadTutorRegularHours(tutorId),
    admin.from("tutor_profiles").select("vacation_mode").eq("id", tutorId).maybeSingle(),
    admin.from("tutor_blocked_time").select("id, start_at, end_at, reason").eq("tutor_id", tutorId).gte("end_at", new Date().toISOString()).order("start_at"),
  ]);
  // One range per day in the editor (the table's shape): a day with several
  // registration ranges is shown from its earliest start to its latest end.
  const days: AvailabilityDay[] = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const ranges = regular.filter((r) => r.dayOfWeek === dayOfWeek);
    if (ranges.length === 0) return { dayOfWeek, enabled: false, start: "09:00", end: "17:00" };
    return {
      dayOfWeek,
      enabled: true,
      start: ranges.map((r) => r.start).sort()[0],
      end: ranges.map((r) => r.end).sort().at(-1)!,
    };
  });
  return {
    days,
    vacationMode: tutor?.vacation_mode === true,
    blocked: ((blockedRows ?? []) as { id: string; start_at: string; end_at: string; reason: string | null }[]).map((b) => ({
      id: b.id,
      startMs: new Date(b.start_at).getTime(),
      endMs: new Date(b.end_at).getTime(),
      reason: b.reason,
    })),
  };
}

export async function loadTutorReviews(tutorId: string): Promise<TutorReviewRow[]> {
  const admin = getServiceRoleClient();
  const { data: rows } = await admin
    .from("reviews")
    .select("id, rating, comment, created_at, reviewer_id, booking_type, tutor_reply, reported")
    .eq("recipient_id", tutorId)
    .eq("direction", "student_to_tutor")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  const reviews = (rows ?? []) as { id: string; rating: number; comment: string | null; created_at: string; reviewer_id: string; booking_type: string | null; tutor_reply: string | null; reported: boolean | null }[];
  const ids = [...new Set(reviews.map((r) => r.reviewer_id))];
  const { data: people } = ids.length ? await admin.from("profiles").select("id, full_name, avatar_url").in("id", ids) : { data: [] };
  const byId = new Map(((people ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]).map((p) => [p.id, p]));
  return reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? "",
    createdAtMs: new Date(r.created_at).getTime(),
    reviewerName: byId.get(r.reviewer_id)?.full_name?.trim() || "Student",
    reviewerImage: byId.get(r.reviewer_id)?.avatar_url ?? null,
    bookingType: r.booking_type,
    reply: r.tutor_reply,
    reported: r.reported === true,
  }));
}
