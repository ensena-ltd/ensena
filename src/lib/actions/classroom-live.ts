"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// What happens in the database when a live (Supabase-backed) class ends:
//
//  - tutor clicks End Class on a private lesson → the lesson is Completed and
//    an escrow record (lesson_confirmations) starts the student's 24h window
//    to confirm or report a problem
//  - tutor ends a group session → the session is Completed and every enrolled
//    student gets their own escrow record (auto-clears after 24h)
//  - a discovery session ends (tutor, or its scheduled time ran out)
//  - a policy violation ends any of these → payment is frozen for review
//
// Idempotent: each step only applies to rows not already completed, so a
// second tab or a retry never creates duplicate escrow records.

export type EndReason = "ended" | "schedule" | "violation";

export interface EndLiveClassInput {
  kind: "private" | "group" | "discovery" | "counselling";
  id: string;
  liveSessionId?: string;
  reason: EndReason;
  issue?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;
const ESCROW_WINDOW_MS = 24 * 3_600_000;

async function currentUser(): Promise<{ id: string; role: string; name: string } | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  return data ? { id: user.id, role: data.role, name: data.full_name?.trim() || "Your tutor" } : null;
}

export async function endLiveClass(input: EndLiveClassInput): Promise<{ ok: boolean; message?: string }> {
  const me = await currentUser();
  if (!me || !UUID.test(input.id)) return { ok: false, message: "Please sign in again." };
  const admin = getServiceRoleClient();
  const now = new Date();
  const frozen = input.reason === "violation" || !!input.issue;
  const disputeReason = input.issue?.slice(0, 1000) ?? null;

  if (input.kind === "private") {
    const { data: lesson } = await admin.from("private_lessons").select("id, student_id, tutor_id, subject, price, payment_status, status, scheduled_at").eq("id", input.id).maybeSingle();
    if (!lesson) return { ok: false, message: "Lesson not found." };
    const isTutor = lesson.tutor_id === me.id;
    const isStudent = lesson.student_id === me.id;
    // Only the tutor ends a lesson; either side's tab can report a violation.
    if (!(isTutor || (isStudent && input.reason === "violation"))) return { ok: false, message: "Only the tutor can end this lesson." };
    if (now.getTime() < new Date(lesson.scheduled_at).getTime()) return { ok: false, message: "This lesson hasn't started yet." };

    const { data: claimed } = await admin.from("private_lessons").update({ status: "Completed" }).eq("id", lesson.id).in("status", ["Upcoming", "Pending"]).select("id");
    if (!claimed || claimed.length === 0) return { ok: true };

    if (lesson.payment_status === "paid" && Number(lesson.price) > 0) {
      await admin.from("lesson_confirmations").insert({
        student_id: lesson.student_id,
        tutor_id: lesson.tutor_id,
        subject: lesson.subject,
        type: "Private",
        amount_gross: lesson.price,
        completed_at: now.toISOString(),
        auto_release_at: new Date(now.getTime() + ESCROW_WINDOW_MS).toISOString(),
        confirmation_status: frozen ? "Disputed" : "Pending",
        escrow_status: frozen ? "Frozen" : "Held",
        dispute_reason: disputeReason,
        disputed_at: frozen ? now.toISOString() : null,
      });
    }
    await Promise.all([
      admin.from("booking_events").insert({ private_lesson_id: lesson.id, event_type: frozen ? "terminated" : "completed", actor_id: me.id, note: disputeReason }),
      admin.from("notifications").insert({
        user_id: lesson.student_id,
        category: "Booking",
        text: frozen
          ? `Your ${lesson.subject} lesson was ended early and is being reviewed by Ensena support.`
          : `Your ${lesson.subject} lesson is complete. Please confirm it went well so ${me.name} gets paid, or report a problem within 24 hours.`,
        action_url: "/student-dashboard/lessons?tab=Completed",
        related_booking_id: lesson.id,
      }),
    ]);
  } else if (input.kind === "group") {
    if (!input.liveSessionId || !UUID.test(input.liveSessionId)) return { ok: false, message: "Session not found." };
    const { data: cls } = await admin.from("group_classes").select("id, tutor_id, title, subject").eq("id", input.id).maybeSingle();
    if (!cls || cls.tutor_id !== me.id) return { ok: false, message: "Only the tutor can end this class." };
    const { data: session } = await admin.from("group_class_sessions").select("id, cohort_id, scheduled_at").eq("id", input.liveSessionId).maybeSingle();
    const { data: cohort } = session ? await admin.from("group_class_cohorts").select("id, group_class_id, price").eq("id", session.cohort_id).maybeSingle() : { data: null };
    if (!session || !cohort || cohort.group_class_id !== cls.id) return { ok: false, message: "Session not found." };

    const { data: claimed } = await admin.from("group_class_sessions").update({ status: "Completed" }).eq("id", session.id).eq("status", "Scheduled").select("id");
    if (!claimed || claimed.length === 0) return { ok: true };

    const [{ data: roster }, { count: totalSessions }] = await Promise.all([
      admin.from("group_class_enrollments").select("student_id").eq("cohort_id", cohort.id).eq("status", "Active"),
      admin.from("group_class_sessions").select("id", { count: "exact", head: true }).eq("cohort_id", cohort.id),
    ]);
    const students = ((roster ?? []) as { student_id: string }[]).map((r) => r.student_id);
    const perStudent = totalSessions ? Math.round(Number(cohort.price) / totalSessions) : 0;
    if (students.length && perStudent > 0) {
      await admin.from("lesson_confirmations").insert(
        students.map((studentId) => ({
          student_id: studentId,
          tutor_id: cls.tutor_id,
          subject: cls.title,
          type: "Group",
          amount_gross: perStudent,
          completed_at: now.toISOString(),
          auto_release_at: new Date(now.getTime() + ESCROW_WINDOW_MS).toISOString(),
          confirmation_status: frozen ? "Disputed" : "Pending",
          escrow_status: frozen ? "Frozen" : "Held",
          dispute_reason: disputeReason,
          disputed_at: frozen ? now.toISOString() : null,
        }))
      );
    }
    if (students.length) {
      await admin.from("notifications").insert(
        students.map((studentId) => ({
          user_id: studentId,
          category: "Booking",
          text: frozen ? `Today's ${cls.title} session was flagged for review.` : `Today's ${cls.title} session is complete. If anything went wrong, you can report it within 24 hours.`,
          action_url: "/student-dashboard/lessons?tab=Completed",
        }))
      );
    }
  } else if (input.kind === "discovery") {
    const { data: d } = await admin.from("discovery_sessions").select("id, student_id, tutor_id, scheduled_start_at").eq("id", input.id).maybeSingle();
    if (!d || (d.tutor_id !== me.id && d.student_id !== me.id)) return { ok: false, message: "Session not found." };
    if (d.student_id === me.id && input.reason === "ended") return { ok: false, message: "Only the tutor can end this session." };
    if (now.getTime() < new Date(d.scheduled_start_at).getTime()) return { ok: false, message: "This session hasn't started yet." };
    await admin.from("discovery_sessions").update({ status: "Completed", funnel_stage: "CompletedAwaitingFeedback" }).eq("id", d.id).eq("status", "Scheduled");
  } else {
    return { ok: true };
  }

  revalidatePath("/student-dashboard", "layout");
  revalidatePath("/tutor-dashboard", "layout");
  return { ok: true };
}
