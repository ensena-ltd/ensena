"use server";

import { revalidatePath } from "next/cache";

import { computeCancellationPolicy } from "@/lib/cancellation-policy";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Writes behind the live student dashboard / My Classes pages. Study tasks
// run as the student (RLS: study_tasks_manage_own). Everything that touches
// a booking or escrow record re-checks that the row belongs to the signed-in
// student first, then writes with the service-role client — students have
// no direct UPDATE policy on lesson_confirmations or cancellations.

export interface LearningActionResult {
  ok: boolean;
  message?: string;
  id?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function currentStudent(): Promise<{ id: string; name: string } | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  return data?.role === "student" ? { id: user.id, name: data.full_name?.trim() || "A student" } : null;
}

function refreshLearningPages() {
  revalidatePath("/student-dashboard", "layout");
}

async function notify(userId: string, category: string, text: string, actionUrl: string, relatedBookingId?: string) {
  const admin = getServiceRoleClient();
  await admin.from("notifications").insert({ user_id: userId, category, text, action_url: actionUrl, related_booking_id: relatedBookingId ?? null });
}

// ── Study tasks ────────────────────────────────────────────────────────

export async function addStudyTask(input: { label: string; subject?: string | null; dueDate?: string | null }): Promise<LearningActionResult> {
  const student = await currentStudent();
  if (!student) return { ok: false, message: "Please sign in again." };
  const label = input.label.trim().slice(0, 200);
  if (!label) return { ok: false, message: "Give the task a name." };
  const dueDate = input.dueDate && ISO_DATE.test(input.dueDate) ? input.dueDate : null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("study_tasks")
    .insert({ student_id: student.id, label, subject: input.subject?.trim().slice(0, 80) || null, due_date: dueDate })
    .select("id")
    .single();
  if (error) return { ok: false, message: "We couldn't add that task. Please try again." };
  refreshLearningPages();
  return { ok: true, id: data.id };
}

export async function setStudyTaskDone(taskId: string, done: boolean): Promise<LearningActionResult> {
  const student = await currentStudent();
  if (!student || !UUID.test(taskId)) return { ok: false, message: "Please sign in again." };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("study_tasks").update({ done }).eq("id", taskId).eq("student_id", student.id);
  if (error) return { ok: false, message: "We couldn't update that task." };
  refreshLearningPages();
  return { ok: true };
}

export async function deleteStudyTask(taskId: string): Promise<LearningActionResult> {
  const student = await currentStudent();
  if (!student || !UUID.test(taskId)) return { ok: false, message: "Please sign in again." };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("study_tasks").delete().eq("id", taskId).eq("student_id", student.id);
  if (error) return { ok: false, message: "We couldn't delete that task." };
  refreshLearningPages();
  return { ok: true };
}

// ── Reviews ────────────────────────────────────────────────────────────

// `bookingId` is a lesson_confirmations id, or a private-lesson / group
// session id for a lesson marked Completed without an escrow record.
export async function submitTutorReview(input: { bookingId: string; bookingType: "private" | "group"; rating: number; comment: string }): Promise<LearningActionResult> {
  const student = await currentStudent();
  if (!student) return { ok: false, message: "Please sign in again." };
  if (!UUID.test(input.bookingId)) return { ok: false, message: "That lesson can't be reviewed." };
  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) return { ok: false, message: "Pick a rating from 1 to 5 stars." };

  const admin = getServiceRoleClient();
  const tutorId = await reviewableTutorFor(student.id, input.bookingId);
  if (!tutorId) return { ok: false, message: "That lesson can't be reviewed yet." };

  const { count } = await admin.from("reviews").select("id", { count: "exact", head: true }).eq("reviewer_id", student.id).eq("booking_id", input.bookingId);
  if ((count ?? 0) > 0) return { ok: false, message: "You've already reviewed this lesson." };

  // Insert as the student so RLS (reviews_insert: reviewer_id = auth.uid()) applies.
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("reviews").insert({
    direction: "student_to_tutor",
    booking_id: input.bookingId,
    booking_type: input.bookingType,
    reviewer_id: student.id,
    recipient_id: tutorId,
    rating,
    comment: input.comment.trim().slice(0, 2000) || null,
  });
  if (error) return { ok: false, message: error.code === "23505" ? "You've already reviewed this lesson." : "We couldn't save your review. Please try again." };
  await notify(tutorId, "Reviews", `${student.name} left you a ${rating}-star review.`, "/tutor-dashboard/reviews", input.bookingId);
  refreshLearningPages();
  return { ok: true };
}

async function reviewableTutorFor(studentId: string, bookingId: string): Promise<string | null> {
  const admin = getServiceRoleClient();
  const { data: confirmation } = await admin.from("lesson_confirmations").select("tutor_id, type, confirmation_status, escrow_status").eq("id", bookingId).eq("student_id", studentId).maybeSingle();
  if (confirmation) {
    if (confirmation.confirmation_status === "Disputed") return null;
    const cleared = confirmation.type === "Group" || confirmation.confirmation_status === "Confirmed" || confirmation.escrow_status === "Released";
    return cleared ? confirmation.tutor_id : null;
  }
  const { data: lesson } = await admin.from("private_lessons").select("tutor_id, status").eq("id", bookingId).eq("student_id", studentId).maybeSingle();
  if (lesson) return lesson.status === "Completed" ? lesson.tutor_id : null;
  const { data: session } = await admin.from("group_class_sessions").select("status, cohort_id").eq("id", bookingId).maybeSingle();
  if (session?.status !== "Completed") return null;
  const { data: enrollment } = await admin.from("group_class_enrollments").select("id").eq("cohort_id", session.cohort_id).eq("student_id", studentId).maybeSingle();
  if (!enrollment) return null;
  const { data: cohort } = await admin.from("group_class_cohorts").select("group_class_id").eq("id", session.cohort_id).maybeSingle();
  const { data: cls } = cohort ? await admin.from("group_classes").select("tutor_id").eq("id", cohort.group_class_id).maybeSingle() : { data: null };
  return cls?.tutor_id ?? null;
}

// ── Lesson confirmations (escrow) ──────────────────────────────────────

export async function confirmLessonCompleted(confirmationId: string): Promise<LearningActionResult> {
  const student = await currentStudent();
  if (!student || !UUID.test(confirmationId)) return { ok: false, message: "Please sign in again." };
  const admin = getServiceRoleClient();
  const { data, error } = await admin
    .from("lesson_confirmations")
    .update({ confirmation_status: "Confirmed", escrow_status: "Released" })
    .eq("id", confirmationId)
    .eq("student_id", student.id)
    .eq("type", "Private")
    .eq("confirmation_status", "Pending")
    .select("tutor_id, subject")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "This lesson was already confirmed or can't be confirmed." };
  await notify(data.tutor_id, "Payments", `${student.name} confirmed your ${data.subject} lesson. Payment has been released.`, "/tutor-dashboard/earnings", confirmationId);
  refreshLearningPages();
  return { ok: true };
}

export async function reportLessonIssue(confirmationId: string, reason: string, details: string): Promise<LearningActionResult> {
  const student = await currentStudent();
  if (!student || !UUID.test(confirmationId)) return { ok: false, message: "Please sign in again." };
  const text = [reason.trim(), details.trim()].filter(Boolean).join(": ").slice(0, 1000);
  if (!text) return { ok: false, message: "Tell us what went wrong." };
  const admin = getServiceRoleClient();
  const { data, error } = await admin
    .from("lesson_confirmations")
    .update({ confirmation_status: "Disputed", escrow_status: "Frozen", dispute_reason: text, disputed_at: new Date().toISOString() })
    .eq("id", confirmationId)
    .eq("student_id", student.id)
    .eq("confirmation_status", "Pending")
    .gt("auto_release_at", new Date().toISOString())
    .select("tutor_id, subject")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "The window to report an issue on this lesson has closed." };
  await notify(data.tutor_id, "Payments", `A student reported an issue with your ${data.subject} lesson. Ensena support will review it.`, "/tutor-dashboard/earnings", confirmationId);
  refreshLearningPages();
  return { ok: true };
}

// ── Cancelling a private lesson ────────────────────────────────────────

export async function cancelPrivateLesson(lessonId: string, reason: string, notes?: string): Promise<LearningActionResult> {
  const student = await currentStudent();
  if (!student || !UUID.test(lessonId)) return { ok: false, message: "Please sign in again." };
  const admin = getServiceRoleClient();
  const { data: lesson } = await admin
    .from("private_lessons")
    .select("id, tutor_id, subject, scheduled_at, price, status, payment_status")
    .eq("id", lessonId)
    .eq("student_id", student.id)
    .maybeSingle();
  if (!lesson) return { ok: false, message: "We couldn't find that lesson." };
  if (lesson.status === "Cancelled" || lesson.status === "Completed") return { ok: false, message: `This lesson is already ${lesson.status.toLowerCase()}.` };
  const nowMs = Date.now();
  const startMs = new Date(lesson.scheduled_at).getTime();
  if (startMs <= nowMs) return { ok: false, message: "This lesson has already started, so it can't be cancelled." };

  const paid = lesson.payment_status === "paid";
  const policy = computeCancellationPolicy({ amount: paid ? Number(lesson.price) || 0 : 0, startMs, nowMs, cancelledBy: "Student" });
  const reasonText = [reason, notes?.trim()].filter(Boolean).join(": ").slice(0, 500);

  const { error } = await admin
    .from("private_lessons")
    .update({
      status: "Cancelled",
      cancelled_at: new Date(nowMs).toISOString(),
      cancellation_reason: reasonText,
      ...(paid && policy.refundAmount > 0 ? { payment_status: policy.refundAmount >= Number(lesson.price) ? "refunded" : "partially_refunded" } : {}),
    })
    .eq("id", lessonId)
    .eq("student_id", student.id);
  if (error) return { ok: false, message: "We couldn't cancel this lesson. Please try again." };

  await Promise.all([
    admin.from("cancellations").insert({
      private_lesson_id: lessonId,
      cancelled_by: student.id,
      reason: reasonText,
      fee: policy.cancellationFee,
      refund_amount: policy.refundAmount,
      policy_snapshot: policy,
    }),
    admin.from("booking_events").insert({ private_lesson_id: lessonId, event_type: "cancelled", actor_id: student.id, note: reasonText, metadata: { by: "student", policy } }),
  ]);
  const when = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(startMs);
  await notify(lesson.tutor_id, "Booking", `${student.name} cancelled their ${lesson.subject} lesson on ${when}.`, `/tutor-dashboard/private-lessons/${lessonId}`, lessonId);
  refreshLearningPages();
  return { ok: true };
}
