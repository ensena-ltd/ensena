"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { endLiveClass } from "@/lib/actions/classroom-live";
import { MAX_ADVANCE_DAYS, MIN_NOTICE_MINUTES, addDaysToISO, dayOfWeekISO, overlaps, parseISODate } from "@/lib/booking-slots";
import { platformWallTimeToMs } from "@/lib/platform-time";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadBusyIntervals } from "@/lib/tutor-directory-server";

// Writes behind the tutor's Classes and Students pages. Each re-checks that
// the signed-in user is a tutor (who passed two-step verification, if they
// use it) and that the lesson/class is theirs, then writes with the
// service-role client and tells the affected students.
//
// Payments are deliberately not touched here: a cancellation records what
// the student is owed (cancellations.refund_amount) but no money moves
// until Paystack refunds are wired up.

export interface TeachingResult {
  ok: boolean;
  message?: string;
  id?: string;
  slug?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 86_400_000;
const MODES = ["Online", "Physical", "Hybrid"];

async function currentTutor(): Promise<{ id: string; name: string; approved: boolean } | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") return null;
  const [{ data: profile }, { data: tutor }] = await Promise.all([
    supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle(),
    supabase.from("tutor_profiles").select("application_status").eq("id", user.id).maybeSingle(),
  ]);
  if (profile?.role !== "tutor") return null;
  return { id: user.id, name: profile.full_name?.trim() || "Your tutor", approved: tutor?.application_status === "approved" };
}

const SIGN_IN_AGAIN = { ok: false, message: "Please sign in again." } as const;

const fmt = (msValue: number) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(msValue);

function refresh() {
  revalidatePath("/tutor-dashboard", "layout");
  revalidatePath("/student-dashboard", "layout");
}

async function notify(userId: string, text: string, actionUrl: string, relatedBookingId?: string) {
  await getServiceRoleClient().from("notifications").insert({ user_id: userId, category: "Booking", text, action_url: actionUrl, related_booking_id: relatedBookingId ?? null });
}

// ── Private lessons ────────────────────────────────────────────────────

async function ownLesson(tutorId: string, lessonId: string) {
  if (!UUID.test(lessonId)) return null;
  const { data } = await getServiceRoleClient()
    .from("private_lessons")
    .select("id, student_id, tutor_id, subject, scheduled_at, duration_minutes, status, payment_status, price")
    .eq("id", lessonId)
    .eq("tutor_id", tutorId)
    .maybeSingle();
  return data;
}

export async function cancelLessonAsTutor(lessonId: string, reason: string): Promise<TeachingResult> {
  const tutor = await currentTutor();
  if (!tutor) return SIGN_IN_AGAIN;
  const lesson = await ownLesson(tutor.id, lessonId);
  if (!lesson) return { ok: false, message: "We couldn't find that lesson." };
  if (lesson.status === "Cancelled" || lesson.status === "Completed") return { ok: false, message: `This lesson is already ${lesson.status.toLowerCase()}.` };
  if (new Date(lesson.scheduled_at).getTime() <= Date.now()) return { ok: false, message: "This lesson has already started, so it can't be cancelled." };
  const text = reason.trim().slice(0, 500);
  if (text.length < 3) return { ok: false, message: "Tell your student why you're cancelling." };

  const admin = getServiceRoleClient();
  const now = new Date().toISOString();
  const { data: claimed } = await admin
    .from("private_lessons")
    .update({ status: "Cancelled", cancelled_at: now, cancellation_reason: text })
    .eq("id", lesson.id)
    .in("status", ["Upcoming", "Pending"])
    .select("id");
  if (!claimed?.length) return { ok: false, message: "This lesson was already updated. Please refresh." };

  // A tutor cancelling always owes the student a full refund.
  const owed = lesson.payment_status === "paid" ? Number(lesson.price) || 0 : 0;
  await Promise.all([
    admin.from("cancellations").insert({ private_lesson_id: lesson.id, cancelled_by: tutor.id, reason: text, fee: 0, refund_amount: owed, policy_snapshot: { cancelledBy: "tutor", refundPct: 100 } }),
    admin.from("booking_events").insert({ private_lesson_id: lesson.id, event_type: "cancelled", actor_id: tutor.id, note: text }),
    notify(
      lesson.student_id,
      `${tutor.name} cancelled your ${lesson.subject} lesson on ${fmt(new Date(lesson.scheduled_at).getTime())}. Reason: ${text}${owed > 0 ? " You'll get a full refund." : ""}`,
      "/student-dashboard/lessons?tab=Cancelled",
      lesson.id
    ),
  ]);
  refresh();
  return { ok: true };
}

export async function rescheduleLessonAsTutor(lessonId: string, newStartMs: number, note: string): Promise<TeachingResult> {
  const tutor = await currentTutor();
  if (!tutor) return SIGN_IN_AGAIN;
  const lesson = await ownLesson(tutor.id, lessonId);
  if (!lesson) return { ok: false, message: "We couldn't find that lesson." };
  if (lesson.status === "Cancelled" || lesson.status === "Completed") return { ok: false, message: `This lesson is already ${lesson.status.toLowerCase()}.` };
  const nowMs = Date.now();
  const oldStartMs = new Date(lesson.scheduled_at).getTime();
  if (oldStartMs <= nowMs) return { ok: false, message: "This lesson has already started." };
  if (!Number.isFinite(newStartMs) || newStartMs === oldStartMs) return { ok: false, message: "Pick a different time." };
  if (newStartMs < nowMs + MIN_NOTICE_MINUTES * 60_000) return { ok: false, message: "Pick a time at least 2 hours from now so your student has notice." };
  if (newStartMs > nowMs + MAX_ADVANCE_DAYS * DAY_MS) return { ok: false, message: "Pick a time within the next 90 days." };

  const duration = lesson.duration_minutes || 60;
  const slot = { startMs: newStartMs, endMs: newStartMs + duration * 60_000 };
  const busy = await loadBusyIntervals(tutor.id, lesson.student_id, newStartMs - DAY_MS, newStartMs + DAY_MS, lesson.id);
  if (busy.some((b) => overlaps(b, slot))) return { ok: false, message: "That time clashes with another class or blocked time (yours or your student's). Pick another." };

  const admin = getServiceRoleClient();
  const newISO = new Date(newStartMs).toISOString();
  const { data: moved } = await admin.from("private_lessons").update({ scheduled_at: newISO }).eq("id", lesson.id).eq("scheduled_at", lesson.scheduled_at).select("id");
  if (!moved?.length) return { ok: false, message: "This lesson was already moved. Please refresh." };
  const text = note.trim().slice(0, 300);
  await Promise.all([
    admin.from("reschedules").insert({ private_lesson_id: lesson.id, requested_by: tutor.id, old_scheduled_at: lesson.scheduled_at, new_scheduled_at: newISO, status: "confirmed" }),
    admin.from("booking_events").insert({ private_lesson_id: lesson.id, event_type: "rescheduled", actor_id: tutor.id, note: text || null, metadata: { from: lesson.scheduled_at, to: newISO } }),
    notify(lesson.student_id, `${tutor.name} moved your ${lesson.subject} lesson from ${fmt(oldStartMs)} to ${fmt(newStartMs)}.${text ? ` Note: ${text}` : ""}`, `/student-dashboard/lessons?view=${lesson.id}`, lesson.id),
  ]);
  refresh();
  return { ok: true };
}

/** For a lesson that took place but was never ended from the classroom. */
export async function markLessonCompleted(lessonId: string): Promise<TeachingResult> {
  const tutor = await currentTutor();
  if (!tutor) return SIGN_IN_AGAIN;
  const lesson = await ownLesson(tutor.id, lessonId);
  if (!lesson) return { ok: false, message: "We couldn't find that lesson." };
  const result = await endLiveClass({ kind: "private", id: lesson.id, reason: "ended" });
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}

// ── Group classes ──────────────────────────────────────────────────────

export interface CreateGroupClassInput {
  title: string;
  subject: string;
  academicLevel: string;
  mode: string;
  description: string;
  learningOutcomes: string[];
  /** Full-course price per student, in naira. */
  price: number;
  seats: number;
  /** First possible session date, YYYY-MM-DD (Lagos). */
  startDate: string;
  /** 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** "HH:MM", 24-hour, Lagos time. */
  time: string;
  durationMinutes: number;
  weeks: number;
  publish: boolean;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function createGroupClass(input: CreateGroupClassInput): Promise<TeachingResult> {
  const tutor = await currentTutor();
  if (!tutor) return SIGN_IN_AGAIN;
  const title = input.title.trim().slice(0, 120);
  const subject = input.subject.trim().slice(0, 80);
  if (title.length < 4) return { ok: false, message: "Give the class a title (at least 4 characters)." };
  if (!subject) return { ok: false, message: "Add the subject you'll teach." };
  if (!MODES.includes(input.mode)) return { ok: false, message: "Pick how the class is taught." };
  const price = Math.round(Number(input.price));
  if (!Number.isFinite(price) || price < 0 || price > 5_000_000) return { ok: false, message: "Enter a valid price." };
  const seats = Math.round(Number(input.seats));
  if (!Number.isFinite(seats) || seats < 2 || seats > 100) return { ok: false, message: "Seats must be between 2 and 100." };
  const days = [...new Set(input.days)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  if (days.length === 0) return { ok: false, message: "Pick at least one day of the week." };
  if (!HHMM.test(input.time)) return { ok: false, message: "Pick a start time." };
  const duration = Math.round(Number(input.durationMinutes));
  if (![30, 45, 60, 75, 90, 120].includes(duration)) return { ok: false, message: "Pick a session length." };
  const weeks = Math.round(Number(input.weeks));
  if (!Number.isFinite(weeks) || weeks < 1 || weeks > 26) return { ok: false, message: "A course can run for 1 to 26 weeks." };
  if (!parseISODate(input.startDate)) return { ok: false, message: "Pick a start date." };
  if (input.publish && !tutor.approved) return { ok: false, message: "You can publish classes once your tutor application is approved. Save it as a draft for now." };

  // Every session, in Lagos time, from the start date for `weeks` weeks.
  const [hh, mm] = input.time.split(":").map(Number);
  const nowMs = Date.now();
  const starts: number[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const iso = addDaysToISO(input.startDate, i);
    if (!days.includes(dayOfWeekISO(iso))) continue;
    const p = parseISODate(iso)!;
    starts.push(platformWallTimeToMs(p.year, p.month, p.day, hh, mm));
  }
  if (starts.length === 0) return { ok: false, message: "None of the chosen days fall inside those weeks." };
  if (starts[0] < nowMs + MIN_NOTICE_MINUTES * 60_000) return { ok: false, message: "The first session must be at least 2 hours from now." };

  // Sessions can't clash with the tutor's own lessons or blocked time.
  const busy = await loadBusyIntervals(tutor.id, tutor.id, starts[0] - DAY_MS, starts[starts.length - 1] + DAY_MS);
  const clash = starts.find((s) => busy.some((b) => overlaps(b, { startMs: s, endMs: s + duration * 60_000 })));
  if (clash) return { ok: false, message: `${fmt(clash)} clashes with another class or blocked time. Pick a different time or start date.` };

  const admin = getServiceRoleClient();
  const slug = `${slugify(title) || "class"}-${randomBytes(3).toString("hex")}`;
  const outcomes = input.learningOutcomes.map((o) => o.trim().slice(0, 200)).filter(Boolean).slice(0, 10);
  const { data: created, error } = await admin
    .from("group_classes")
    .insert({
      slug,
      tutor_id: tutor.id,
      title,
      subject,
      academic_level: input.academicLevel.trim().slice(0, 60) || null,
      class_grade: input.academicLevel.trim().slice(0, 60) || null,
      mode: input.mode,
      description: input.description.trim().slice(0, 3000) || null,
      learning_outcomes: outcomes,
      pricing: { coursePrice: price, currency: "NGN" },
      status: input.publish ? "Published" : "Draft",
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: "We couldn't create the class. Please try again." };

  const lastIso = new Date(starts[starts.length - 1]).toISOString();
  const { data: cohort, error: cohortError } = await admin
    .from("group_class_cohorts")
    .insert({
      group_class_id: created.id,
      cohort_index: 1,
      start_date: input.startDate,
      end_date: lastIso.slice(0, 10),
      schedule: { days, time: input.time, durationMinutes: duration, weeks },
      seats_total: seats,
      seats_filled: 0,
      price,
      status: "Scheduled",
    })
    .select("id")
    .single();
  const { error: sessionError } = cohort
    ? await admin.from("group_class_sessions").insert(
        starts.map((s, i) => ({ cohort_id: cohort.id, session_number: i + 1, week_number: Math.floor((s - starts[0]) / (7 * DAY_MS)) + 1, scheduled_at: new Date(s).toISOString(), status: "Scheduled" }))
      )
    : { error: cohortError };
  if (cohortError || sessionError) {
    await admin.from("group_classes").delete().eq("id", created.id);
    return { ok: false, message: "We couldn't schedule the class sessions. Please try again." };
  }
  refresh();
  return { ok: true, id: created.id, slug };
}

async function ownClass(tutorId: string, classId: string) {
  if (!UUID.test(classId)) return null;
  const { data } = await getServiceRoleClient().from("group_classes").select("id, title, status, slug").eq("id", classId).eq("tutor_id", tutorId).maybeSingle();
  return data;
}

async function activeRoster(classId: string): Promise<{ cohortIds: string[]; students: { id: string; enrollmentId: string; cohortId: string }[] }> {
  const admin = getServiceRoleClient();
  const { data: cohorts } = await admin.from("group_class_cohorts").select("id").eq("group_class_id", classId);
  const cohortIds = (cohorts ?? []).map((c) => c.id as string);
  const { data: enrollments } = cohortIds.length ? await admin.from("group_class_enrollments").select("id, student_id, cohort_id").in("cohort_id", cohortIds).eq("status", "Active") : { data: [] };
  return { cohortIds, students: (enrollments ?? []).map((e) => ({ id: e.student_id as string, enrollmentId: e.id as string, cohortId: e.cohort_id as string })) };
}

export async function setGroupClassPublished(classId: string, publish: boolean): Promise<TeachingResult> {
  const tutor = await currentTutor();
  if (!tutor) return SIGN_IN_AGAIN;
  const cls = await ownClass(tutor.id, classId);
  if (!cls) return { ok: false, message: "We couldn't find that class." };
  if (cls.status === "Cancelled" || cls.status === "Completed") return { ok: false, message: `This class is ${cls.status.toLowerCase()}.` };
  if (publish && !tutor.approved) return { ok: false, message: "You can publish classes once your tutor application is approved." };
  if (publish) {
    const { cohortIds } = await activeRoster(cls.id);
    const { count } = cohortIds.length
      ? await getServiceRoleClient().from("group_class_sessions").select("id", { count: "exact", head: true }).in("cohort_id", cohortIds).eq("status", "Scheduled").gt("scheduled_at", new Date().toISOString())
      : { count: 0 };
    if (!count) return { ok: false, message: "This class has no upcoming sessions left to publish." };
  }
  const { error } = await getServiceRoleClient()
    .from("group_classes")
    .update({ status: publish ? "Published" : "Draft", updated_at: new Date().toISOString() })
    .eq("id", cls.id);
  if (error) return { ok: false, message: "We couldn't update the class." };
  refresh();
  return { ok: true };
}

export async function updateGroupClassDetails(classId: string, input: { description: string; learningOutcomes: string[] }): Promise<TeachingResult> {
  const tutor = await currentTutor();
  if (!tutor) return SIGN_IN_AGAIN;
  const cls = await ownClass(tutor.id, classId);
  if (!cls) return { ok: false, message: "We couldn't find that class." };
  const outcomes = input.learningOutcomes.map((o) => o.trim().slice(0, 200)).filter(Boolean).slice(0, 10);
  const { error } = await getServiceRoleClient()
    .from("group_classes")
    .update({ description: input.description.trim().slice(0, 3000) || null, learning_outcomes: outcomes, updated_at: new Date().toISOString() })
    .eq("id", cls.id);
  if (error) return { ok: false, message: "We couldn't save the class details." };
  refresh();
  return { ok: true };
}

export async function cancelGroupSession(classId: string, sessionId: string, reason: string): Promise<TeachingResult> {
  const tutor = await currentTutor();
  if (!tutor) return SIGN_IN_AGAIN;
  const cls = await ownClass(tutor.id, classId);
  if (!cls || !UUID.test(sessionId)) return { ok: false, message: "We couldn't find that session." };
  const { cohortIds, students } = await activeRoster(cls.id);
  const admin = getServiceRoleClient();
  const { data: session } = await admin.from("group_class_sessions").select("id, cohort_id, scheduled_at, status, session_number").eq("id", sessionId).maybeSingle();
  if (!session || !cohortIds.includes(session.cohort_id)) return { ok: false, message: "We couldn't find that session." };
  if (session.status !== "Scheduled") return { ok: false, message: `This session is already ${session.status.toLowerCase()}.` };
  if (new Date(session.scheduled_at).getTime() <= Date.now()) return { ok: false, message: "This session has already started." };
  const text = reason.trim().slice(0, 300);
  if (text.length < 3) return { ok: false, message: "Tell your students why this session is cancelled." };
  const { error } = await admin.from("group_class_sessions").update({ status: "Cancelled" }).eq("id", session.id).eq("status", "Scheduled");
  if (error) return { ok: false, message: "We couldn't cancel that session." };
  const when = fmt(new Date(session.scheduled_at).getTime());
  await Promise.all(
    students.filter((s) => s.cohortId === session.cohort_id).map((s) => notify(s.id, `${tutor.name} cancelled session ${session.session_number} of ${cls.title} (${when}). Reason: ${text}`, "/student-dashboard/lessons", s.enrollmentId))
  );
  refresh();
  return { ok: true };
}

export async function cancelGroupClass(classId: string, reason: string): Promise<TeachingResult> {
  const tutor = await currentTutor();
  if (!tutor) return SIGN_IN_AGAIN;
  const cls = await ownClass(tutor.id, classId);
  if (!cls) return { ok: false, message: "We couldn't find that class." };
  if (cls.status === "Cancelled") return { ok: false, message: "This class is already cancelled." };
  const text = reason.trim().slice(0, 500);
  if (text.length < 3) return { ok: false, message: "Tell your students why the class is cancelled." };

  const admin = getServiceRoleClient();
  const { cohortIds, students } = await activeRoster(cls.id);
  const nowIso = new Date().toISOString();
  const { data: cohorts } = cohortIds.length ? await admin.from("group_class_cohorts").select("id, price").in("id", cohortIds) : { data: [] };
  const priceOf = new Map((cohorts ?? []).map((c) => [c.id as string, Number(c.price) || 0]));

  await admin.from("group_classes").update({ status: "Cancelled", updated_at: nowIso }).eq("id", cls.id);
  if (cohortIds.length) {
    await Promise.all([
      admin.from("group_class_cohorts").update({ status: "Cancelled" }).in("id", cohortIds).neq("status", "Completed"),
      admin.from("group_class_sessions").update({ status: "Cancelled" }).in("cohort_id", cohortIds).eq("status", "Scheduled").gt("scheduled_at", nowIso),
    ]);
  }
  if (students.length) {
    await admin.from("group_class_enrollments").update({ status: "Cancelled", cancelled_at: nowIso }).in("id", students.map((s) => s.enrollmentId));
    await admin.from("cancellations").insert(
      students.map((s) => ({ group_class_enrollment_id: s.enrollmentId, cancelled_by: tutor.id, reason: text, fee: 0, refund_amount: priceOf.get(s.cohortId) ?? 0, policy_snapshot: { cancelledBy: "tutor", scope: "class" } }))
    );
    await Promise.all(students.map((s) => notify(s.id, `${tutor.name} cancelled the group class "${cls.title}". Reason: ${text} You'll be refunded for the sessions you haven't had.`, "/student-dashboard/lessons", s.enrollmentId)));
  }
  refresh();
  return { ok: true };
}

/** For a group session that took place but was never ended from the classroom. */
export async function markGroupSessionCompleted(classId: string, sessionId: string): Promise<TeachingResult> {
  const tutor = await currentTutor();
  if (!tutor) return SIGN_IN_AGAIN;
  const cls = await ownClass(tutor.id, classId);
  if (!cls || !UUID.test(sessionId)) return { ok: false, message: "We couldn't find that class." };
  const { data: session } = await getServiceRoleClient().from("group_class_sessions").select("scheduled_at").eq("id", sessionId).maybeSingle();
  if (!session) return { ok: false, message: "We couldn't find that session." };
  if (new Date(session.scheduled_at).getTime() > Date.now()) return { ok: false, message: "This session hasn't started yet." };
  const result = await endLiveClass({ kind: "group", id: cls.id, liveSessionId: sessionId, reason: "ended" });
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}

// ── Discovery sessions ─────────────────────────────────────────────────

/** For a discovery session that took place but was never ended from the classroom. */
export async function markDiscoveryCompleted(sessionId: string): Promise<TeachingResult> {
  const tutor = await currentTutor();
  if (!tutor) return SIGN_IN_AGAIN;
  if (!UUID.test(sessionId)) return { ok: false, message: "We couldn't find that session." };
  const { data } = await getServiceRoleClient().from("discovery_sessions").select("id").eq("id", sessionId).eq("tutor_id", tutor.id).maybeSingle();
  if (!data) return { ok: false, message: "We couldn't find that session." };
  const result = await endLiveClass({ kind: "discovery", id: sessionId, reason: "ended" });
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}
