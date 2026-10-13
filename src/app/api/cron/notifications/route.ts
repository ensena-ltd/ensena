import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { notifyOnce } from "@/lib/notifications";

// Scheduled job (e.g. every 15 minutes) that sends:
//   - lesson reminders: private lessons starting within the next 24 hours
//     (to the student and the tutor)
//   - new homework: homework assigned in the last 2 days
//   - homework due soon: due within the next 24 hours and not submitted
// Each goes out once (notification_log), by email and/or push according to
// each person's notification settings.
//
// Protected by CRON_SECRET: call with header `Authorization: Bearer <CRON_SECRET>`
// (Vercel Cron sends this automatically when CRON_SECRET is set).
export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getServiceRoleClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 3600_000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600_000).toISOString();
  const counts = { lessonReminders: 0, homeworkAssigned: 0, homeworkDue: 0 };

  const names = new Map<string, string>();
  async function nameOf(id: string | null) {
    if (!id) return "your tutor";
    if (!names.has(id)) {
      const { data } = await admin.from("profiles").select("full_name").eq("id", id).maybeSingle();
      names.set(id, data?.full_name?.trim() || "your tutor");
    }
    return names.get(id)!;
  }

  // Lesson reminders
  const { data: lessons } = await admin
    .from("private_lessons")
    .select("id, student_id, tutor_id, subject, scheduled_at, status")
    .in("status", ["Upcoming", "Pending"])
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", in24h);
  for (const l of (lessons ?? []) as { id: string; student_id: string | null; tutor_id: string | null; subject: string; scheduled_at: string }[]) {
    const when = fmt(l.scheduled_at);
    if (l.student_id) {
      const tutor = await nameOf(l.tutor_id);
      if (await notifyOnce(l.student_id, "lesson_reminder_24h", l.id, { category: "reminder", title: `Reminder: ${l.subject} lesson ${when}`, body: `Your ${l.subject} lesson with ${tutor} starts ${when}.`, url: "/student-dashboard/lessons/upcoming", ctaLabel: "View lesson" })) counts.lessonReminders++;
    }
    if (l.tutor_id) {
      const student = l.student_id ? await nameOf(l.student_id) : "your student";
      if (await notifyOnce(l.tutor_id, "lesson_reminder_24h", l.id, { category: "reminder", title: `Reminder: ${l.subject} lesson ${when}`, body: `You're teaching ${l.subject} to ${student} ${when}.`, url: "/tutor-dashboard/private-lessons", ctaLabel: "View lesson" })) counts.lessonReminders++;
    }
  }

  // Homework: newly assigned + due soon
  const { data: homework } = await admin
    .from("homework_items")
    .select("id, student_id, tutor_id, title, subject, status, due_at, submitted_at, created_at")
    .or(`created_at.gte.${twoDaysAgo},and(due_at.gte.${now.toISOString()},due_at.lte.${in24h})`);
  for (const h of (homework ?? []) as { id: string; student_id: string | null; tutor_id: string | null; title: string; subject: string | null; status: string | null; due_at: string | null; submitted_at: string | null; created_at: string }[]) {
    if (!h.student_id) continue;
    const tutor = await nameOf(h.tutor_id);
    if (h.created_at >= twoDaysAgo) {
      if (await notifyOnce(h.student_id, "homework_assigned", h.id, { category: "homework", title: `New homework: ${h.title}`, body: `${tutor} set you new ${h.subject ?? ""} homework: "${h.title}"${h.due_at ? `, due ${fmt(h.due_at)}` : ""}.`, url: "/student-dashboard/homework", ctaLabel: "View homework" })) counts.homeworkAssigned++;
    }
    const done = !!h.submitted_at || /submitted|graded|completed/i.test(h.status ?? "");
    if (h.due_at && !done && h.due_at >= now.toISOString() && h.due_at <= in24h) {
      if (await notifyOnce(h.student_id, "homework_due_24h", h.id, { category: "homework", title: `Homework due soon: ${h.title}`, body: `"${h.title}" is due ${fmt(h.due_at)}. Don't forget to submit it.`, url: "/student-dashboard/homework", ctaLabel: "Submit homework" })) counts.homeworkDue++;
    }
  }

  return NextResponse.json({ ok: true, ...counts, ranAt: now.toISOString() });
}
