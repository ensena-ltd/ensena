"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  MAX_ADVANCE_DAYS,
  MAX_WEEKS,
  MIN_NOTICE_MINUTES,
  MONTH_WEEKS,
  UNPAID_HOLD_MINUTES,
  availableSlots,
  bookingPrices,
  overlaps,
  parseISODate,
  type BookingFrequency,
  type Slot,
} from "@/lib/booking-slots";
import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { getPlatformTodayParts } from "@/lib/platform-time";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadBusyIntervals, loadTutorProfile, loadTutorWeekly } from "@/lib/tutor-directory-server";
import { recordBookingPaid } from "@/lib/booking-payments-server";
import { isPublicOrigin } from "@/lib/site-url";
import { requestOrigin } from "@/lib/site-url-server";

// Booking, paying for and rescheduling a real tutor's private lessons.
// Every write re-checks the tutor's availability on the server — the slot
// list a student saw a minute ago is never trusted — and is done with the
// service-role client only after confirming who the student is.

export interface BookingActionResult {
  ok: boolean;
  message?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;
const DAY_MS = 86_400_000;

async function currentStudent(): Promise<{ id: string; name: string; email: string } | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role, full_name, email").eq("id", user.id).maybeSingle();
  return data?.role === "student" ? { id: user.id, name: data.full_name?.trim() || "A student", email: data.email || user.email || "" } : null;
}

function dateISOFor(ms: number): string {
  const { year, month, day } = getPlatformTodayParts(ms);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── Slots ──────────────────────────────────────────────────────────────

export async function getBookableSlots(input: { tutorId: string; dateISO: string; durationMinutes: number; excludeLessonId?: string }): Promise<{ ok: boolean; slots: Slot[]; message?: string }> {
  const student = await currentStudent();
  if (!student) return { ok: false, slots: [], message: "Please sign in again." };
  if (!UUID.test(input.tutorId) || !parseISODate(input.dateISO)) return { ok: false, slots: [] };
  const date = parseISODate(input.dateISO)!;
  const dayStart = Date.UTC(date.year, date.month - 1, date.day) - 3_600_000;
  if (dayStart > Date.now() + MAX_ADVANCE_DAYS * DAY_MS) return { ok: true, slots: [] };
  const [weekly, busy] = await Promise.all([
    loadTutorWeekly(input.tutorId),
    loadBusyIntervals(input.tutorId, student.id, dayStart, dayStart + DAY_MS + 3_600_000, input.excludeLessonId),
  ]);
  return { ok: true, slots: availableSlots({ dateISO: input.dateISO, durationMinutes: input.durationMinutes, weekly, busy, nowMs: Date.now() }) };
}

// ── Creating a booking ─────────────────────────────────────────────────

export interface CreateBookingInput {
  tutorId: string;
  subject: string;
  durationMinutes: number;
  frequency: BookingFrequency;
  /** Weekly plans only: how many weeks (monthly is always MONTH_WEEKS). */
  weeks?: number;
  /** First-week start time(s), epoch ms. Recurring plans repeat each weekly. */
  startTimes: number[];
  notes?: string;
}

export async function createPrivateBooking(input: CreateBookingInput): Promise<BookingActionResult & { bookingGroupId?: string }> {
  const student = await currentStudent();
  if (!student) return { ok: false, message: "Please sign in as a student to book a lesson." };

  const tutor = await loadTutorProfile(input.tutorId);
  if (!tutor || tutor.onVacation) return { ok: false, message: "This tutor isn't taking bookings right now." };
  if (!tutor.pricePerHour) return { ok: false, message: "This tutor hasn't set a price yet, so they can't be booked online." };
  const subject = tutor.subjects.find((s) => s === input.subject);
  if (!subject) return { ok: false, message: "Pick one of the subjects this tutor teaches." };
  if (!tutor.classDurations.includes(input.durationMinutes)) return { ok: false, message: "Pick one of the lesson lengths this tutor offers." };
  if (!["oneTime", "weekly", "monthly"].includes(input.frequency)) return { ok: false, message: "Pick how often you'd like lessons." };

  const firstWeek = [...new Set(input.startTimes)].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (firstWeek.length === 0) return { ok: false, message: "Pick a time for your lesson." };
  if (input.frequency === "oneTime" && firstWeek.length !== 1) return { ok: false, message: "A one-time booking is a single lesson." };
  if (firstWeek.length > 7) return { ok: false, message: "You can pick up to 7 lessons a week." };
  if (firstWeek[firstWeek.length - 1] - firstWeek[0] >= 7 * DAY_MS) return { ok: false, message: "Your first-week lessons must all fall within 7 days." };
  const weeks = input.frequency === "oneTime" ? 1 : input.frequency === "monthly" ? MONTH_WEEKS : Math.min(Math.max(Math.round(input.weeks ?? 4), 1), MAX_WEEKS);

  const starts = Array.from({ length: weeks }, (_, w) => firstWeek.map((t) => t + w * 7 * DAY_MS)).flat().sort((a, b) => a - b);
  const duration = input.durationMinutes;

  // Server-side availability check for every single occurrence.
  const nowMs = Date.now();
  const busy = await loadBusyIntervals(tutor.id, student.id, starts[0] - DAY_MS, starts[starts.length - 1] + DAY_MS);
  const accepted: { startMs: number; endMs: number }[] = [];
  for (const startMs of starts) {
    const slot = { startMs, endMs: startMs + duration * 60_000 };
    const ok =
      startMs <= nowMs + MAX_ADVANCE_DAYS * DAY_MS &&
      availableSlots({ dateISO: dateISOFor(startMs), durationMinutes: duration, weekly: tutor.weekly, busy, nowMs }).some((s) => s.startMs === startMs) &&
      !accepted.some((a) => overlaps(a, slot));
    if (!ok) {
      const when = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(startMs);
      return { ok: false, message: `${when} isn't available any more. Please pick a different time.` };
    }
    accepted.push(slot);
  }

  const { perSession } = bookingPrices(tutor.pricePerHour, duration, input.frequency, starts.length);
  const admin = getServiceRoleClient();
  const { data: studentProfile } = await admin.from("student_profiles").select("academic_detail, academic_level").eq("id", student.id).maybeSingle();
  const bookingGroupId = randomUUID();
  const notes = input.notes?.trim().slice(0, 1000) || null;
  // Reminder emails for these lessons link back to the site they were booked on.
  const origin = await requestOrigin();
  const siteOrigin = isPublicOrigin(origin) ? origin : null;

  const rows = [];
  for (const [i, startMs] of starts.entries()) {
    const reference = await generateUniqueReferenceCode("private", async (candidate) => {
      const { count } = await admin.from("private_lessons").select("id", { count: "exact", head: true }).eq("booking_reference", candidate);
      return (count ?? 0) > 0;
    });
    rows.push({
      booking_reference: reference,
      student_id: student.id,
      tutor_id: tutor.id,
      subject,
      academic_level: studentProfile?.academic_detail || studentProfile?.academic_level || null,
      scheduled_at: new Date(startMs).toISOString(),
      duration_minutes: duration,
      mode: "Online",
      status: "Pending",
      price: perSession[i],
      frequency: input.frequency,
      booking_group_id: bookingGroupId,
      session_number: i + 1,
      total_sessions: starts.length,
      notes,
      payment_status: "unpaid",
      site_origin: siteOrigin,
    });
  }
  const { data: inserted, error } = await admin.from("private_lessons").insert(rows).select("id");
  if (error || !inserted) {
    console.error("createPrivateBooking insert failed", error);
    return { ok: false, message: "We couldn't create your booking. Please try again." };
  }
  await admin.from("booking_events").insert(inserted.map((r) => ({ private_lesson_id: r.id, event_type: "created", actor_id: student.id, metadata: { booking_group_id: bookingGroupId } })));
  revalidatePath("/student-dashboard", "layout");
  return { ok: true, bookingGroupId };
}

// ── Paying ─────────────────────────────────────────────────────────────

/** Sends the student to Paystack to pay for an unpaid booking. */
export async function startBookingCheckout(bookingGroupId: string): Promise<BookingActionResult & { url?: string }> {
  const student = await currentStudent();
  if (!student) return { ok: false, message: "Please sign in again." };
  if (!UUID.test(bookingGroupId)) return { ok: false, message: "We couldn't find that booking." };
  if (!isPaystackConfigured()) return { ok: false, message: "Online payments aren't set up yet. Please contact Ensena support to complete this booking." };
  if (!student.email) return { ok: false, message: "Add an email address to your account to pay online." };

  const admin = getServiceRoleClient();
  const { data } = await admin
    .from("private_lessons")
    .select("id, tutor_id, subject, price, scheduled_at, duration_minutes, status, payment_status, updated_at")
    .eq("booking_group_id", bookingGroupId)
    .eq("student_id", student.id)
    .order("scheduled_at");
  const lessons = (data ?? []) as { id: string; tutor_id: string; subject: string; price: number; scheduled_at: string; duration_minutes: number; status: string; payment_status: string; updated_at: string }[];
  if (lessons.length === 0) return { ok: false, message: "We couldn't find that booking." };
  if (lessons.every((l) => l.payment_status === "paid")) return { ok: false, message: "This booking is already paid." };
  if (lessons.some((l) => l.status === "Cancelled")) return { ok: false, message: "This booking was cancelled. Please book again." };
  const nowMs = Date.now();
  if (new Date(lessons[0].scheduled_at).getTime() < nowMs + 30 * 60_000) return { ok: false, message: "This lesson starts too soon to pay for online. Please book a new time." };

  // The unpaid hold lapsed — make sure nobody has taken these times since.
  if (new Date(lessons[0].updated_at).getTime() < nowMs - UNPAID_HOLD_MINUTES * 60_000) {
    const first = new Date(lessons[0].scheduled_at).getTime();
    const last = new Date(lessons[lessons.length - 1].scheduled_at).getTime();
    const busy = await loadBusyIntervals(lessons[0].tutor_id, student.id, first - DAY_MS, last + DAY_MS, lessons.map((l) => l.id));
    const clash = lessons.some((l) => {
      const startMs = new Date(l.scheduled_at).getTime();
      return busy.some((b) => overlaps(b, { startMs, endMs: startMs + l.duration_minutes * 60_000 }));
    });
    if (clash) {
      await admin.from("private_lessons").update({ status: "Cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: "Payment not completed in time; slot taken" }).eq("booking_group_id", bookingGroupId).eq("payment_status", "unpaid");
      revalidatePath("/student-dashboard", "layout");
      return { ok: false, message: "Sorry, one of these times was booked by someone else while payment was pending. Please book a new time." };
    }
  }
  // (Re)start the hold so the slots stay reserved while they pay.
  await admin.from("private_lessons").update({ updated_at: new Date().toISOString() }).eq("booking_group_id", bookingGroupId).eq("payment_status", "unpaid");

  const total = lessons.reduce((sum, l) => sum + Number(l.price), 0);
  const origin = await requestOrigin();
  try {
    const { authorizationUrl } = await initializeTransaction({
      email: student.email,
      amountNaira: total,
      reference: `ENS-${bookingGroupId.slice(0, 8)}-${nowMs.toString(36)}`.toUpperCase(),
      callbackUrl: `${origin}/student-dashboard/payments/callback`,
      metadata: { booking_group_id: bookingGroupId, student_id: student.id, kind: "private_lessons", lessons: lessons.length },
    });
    return { ok: true, url: authorizationUrl };
  } catch (error) {
    console.error("Paystack initialize failed", error);
    return { ok: false, message: "We couldn't start the payment with Paystack. Please try again." };
  }
}

/** Releases an unpaid booking the student no longer wants. */
export async function cancelUnpaidBooking(bookingGroupId: string): Promise<BookingActionResult> {
  const student = await currentStudent();
  if (!student || !UUID.test(bookingGroupId)) return { ok: false, message: "Please sign in again." };
  const admin = getServiceRoleClient();
  const { error } = await admin
    .from("private_lessons")
    .update({ status: "Cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: "Booking abandoned before payment" })
    .eq("booking_group_id", bookingGroupId)
    .eq("student_id", student.id)
    .eq("payment_status", "unpaid");
  if (error) return { ok: false, message: "We couldn't cancel this booking." };
  revalidatePath("/student-dashboard", "layout");
  return { ok: true };
}

// ── Rescheduling ───────────────────────────────────────────────────────

export async function reschedulePrivateLesson(lessonId: string, newStartMs: number): Promise<BookingActionResult> {
  const student = await currentStudent();
  if (!student || !UUID.test(lessonId)) return { ok: false, message: "Please sign in again." };
  const admin = getServiceRoleClient();
  const { data: lesson } = await admin
    .from("private_lessons")
    .select("id, tutor_id, subject, scheduled_at, duration_minutes, status, payment_status")
    .eq("id", lessonId)
    .eq("student_id", student.id)
    .maybeSingle();
  if (!lesson) return { ok: false, message: "We couldn't find that lesson." };
  if (lesson.status === "Cancelled" || lesson.status === "Completed") return { ok: false, message: `This lesson is already ${lesson.status.toLowerCase()}.` };
  const nowMs = Date.now();
  const oldStartMs = new Date(lesson.scheduled_at).getTime();
  if (oldStartMs < nowMs + MIN_NOTICE_MINUTES * 60_000) return { ok: false, message: "Lessons can only be moved more than 2 hours before they start." };
  if (newStartMs === oldStartMs) return { ok: false, message: "Pick a different time." };

  const [weekly, busy] = await Promise.all([
    loadTutorWeekly(lesson.tutor_id),
    loadBusyIntervals(lesson.tutor_id, student.id, newStartMs - DAY_MS, newStartMs + DAY_MS, lesson.id),
  ]);
  const free =
    newStartMs <= nowMs + MAX_ADVANCE_DAYS * DAY_MS &&
    availableSlots({ dateISO: dateISOFor(newStartMs), durationMinutes: lesson.duration_minutes, weekly, busy, nowMs }).some((s) => s.startMs === newStartMs);
  if (!free) return { ok: false, message: "That time isn't available any more. Please pick another." };

  const newISO = new Date(newStartMs).toISOString();
  const { error } = await admin.from("private_lessons").update({ scheduled_at: newISO }).eq("id", lesson.id).eq("scheduled_at", lesson.scheduled_at);
  if (error) return { ok: false, message: "We couldn't move this lesson. Please try again." };

  const fmt = (ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(ms);
  await Promise.all([
    admin.from("reschedules").insert({ private_lesson_id: lesson.id, requested_by: student.id, old_scheduled_at: lesson.scheduled_at, new_scheduled_at: newISO, status: "confirmed" }),
    admin.from("booking_events").insert({ private_lesson_id: lesson.id, event_type: "rescheduled", actor_id: student.id, metadata: { from: lesson.scheduled_at, to: newISO } }),
    admin.from("notifications").insert({
      user_id: lesson.tutor_id,
      category: "Booking",
      text: `${student.name} moved their ${lesson.subject} lesson from ${fmt(oldStartMs)} to ${fmt(newStartMs)}.`,
      action_url: `/tutor-dashboard/classroom/private/${lesson.id}`,
      related_booking_id: lesson.id,
    }),
  ]);
  revalidatePath("/student-dashboard", "layout");
  return { ok: true };
}

// ── Booking page helpers ───────────────────────────────────────────────

const lagosHHMM = (ms: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);

/** Dates between fromISO and toISO (inclusive, max 62 days) with at least one open slot. */
export async function getAvailableDates(input: { tutorId: string; fromISO: string; toISO: string; durationMinutes: number }): Promise<{ ok: boolean; dates: string[] }> {
  const student = await currentStudent();
  if (!student || !UUID.test(input.tutorId)) return { ok: false, dates: [] };
  const from = parseISODate(input.fromISO);
  const to = parseISODate(input.toISO);
  if (!from || !to) return { ok: false, dates: [] };
  const fromMs = Date.UTC(from.year, from.month - 1, from.day) - 3_600_000;
  const toMs = Math.min(Date.UTC(to.year, to.month - 1, to.day) + DAY_MS, fromMs + 62 * DAY_MS, Date.now() + MAX_ADVANCE_DAYS * DAY_MS);
  if (toMs <= fromMs) return { ok: true, dates: [] };
  const [weekly, busy] = await Promise.all([loadTutorWeekly(input.tutorId), loadBusyIntervals(input.tutorId, student.id, fromMs, toMs)]);
  const nowMs = Date.now();
  const dates: string[] = [];
  for (let ms = fromMs + 3_600_000; ms < toMs; ms += DAY_MS) {
    const iso = new Date(ms).toISOString().slice(0, 10);
    if (availableSlots({ dateISO: iso, durationMinutes: input.durationMinutes, weekly, busy, nowMs }).length > 0) dates.push(iso);
  }
  return { ok: true, dates };
}

/**
 * Start times ("HH:MM", West Africa Time) open on EVERY one of `dates` —
 * the first week of a booking, so one preferred time works for each lesson.
 */
export async function getCommonTimes(input: { tutorId: string; dates: string[]; durationMinutes: number }): Promise<{ ok: boolean; times: string[] }> {
  const student = await currentStudent();
  const dates = [...new Set(input.dates)].filter((d) => parseISODate(d)).sort();
  if (!student || !UUID.test(input.tutorId) || dates.length === 0 || dates.length > 7) return { ok: false, times: [] };
  const first = parseISODate(dates[0])!;
  const last = parseISODate(dates[dates.length - 1])!;
  const fromMs = Date.UTC(first.year, first.month - 1, first.day) - 3_600_000;
  const toMs = Date.UTC(last.year, last.month - 1, last.day) + DAY_MS;
  const [weekly, busy] = await Promise.all([loadTutorWeekly(input.tutorId), loadBusyIntervals(input.tutorId, student.id, fromMs, toMs)]);
  const nowMs = Date.now();
  const perDay = dates.map((iso) => new Set(availableSlots({ dateISO: iso, durationMinutes: input.durationMinutes, weekly, busy, nowMs }).map((s) => lagosHHMM(s.startMs))));
  const common = [...perDay[0]].filter((t) => perDay.every((day) => day.has(t)));
  return { ok: true, times: common.sort() };
}

/**
 * The review page's "Pay" button: creates the booking (re-checking every
 * lesson time on the server) and pays for it. With Paystack configured the
 * student is sent to Paystack; without it the payment is a recorded TEST
 * payment so the whole flow can be used before payments go live.
 */
export async function bookAndPay(input: CreateBookingInput & { paymentPlan: "oneTime" | "recurring" }): Promise<BookingActionResult & { redirectUrl?: string }> {
  const created = await createPrivateBooking(input);
  if (!created.ok || !created.bookingGroupId) return { ok: false, message: created.message };
  const confirmation = `/student-dashboard/tutors/${input.tutorId}/book/confirmation?booking=${created.bookingGroupId}`;

  if (isPaystackConfigured()) {
    const checkout = await startBookingCheckout(created.bookingGroupId);
    return checkout.ok && checkout.url ? { ok: true, redirectUrl: checkout.url } : { ok: false, message: checkout.message };
  }

  const student = await currentStudent();
  if (!student) return { ok: false, message: "Please sign in again." };
  const { data } = await getServiceRoleClient().from("private_lessons").select("price").eq("booking_group_id", created.bookingGroupId).eq("student_id", student.id);
  const amount = ((data ?? []) as { price: number }[]).reduce((sum, l) => sum + Number(l.price), 0);
  const paid = await recordBookingPaid({
    bookingGroupId: created.bookingGroupId,
    studentId: student.id,
    amountPaid: amount,
    paidAt: new Date().toISOString(),
    provider: "test",
    reference: `TEST-${created.bookingGroupId.slice(0, 8).toUpperCase()}`,
    mode: input.frequency === "oneTime" ? "oneTime" : input.paymentPlan,
  });
  if (!paid.ok) return { ok: false, message: paid.message };
  revalidatePath("/student-dashboard", "layout");
  return { ok: true, redirectUrl: confirmation };
}
