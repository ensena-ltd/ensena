"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";

// Admin actions for Users / User Directory / Bookings. Restrictions,
// cancellations and reschedules go through the database RPCs, which do their
// own is_admin / staff-permission checks. Writes the RPCs don't cover
// (in-app notifications, admin notes) use the service role, so they're only
// made after confirming the caller is an admin here first.

export interface AdminPeopleResult {
  ok: boolean;
  message?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;

async function currentAdmin(): Promise<{ id: string; name: string } | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") return null;
  return { id: user.id, name: data.full_name?.trim() || "Ensena admin" };
}

async function audit(actorId: string, action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  const supabase = await getSupabaseServerClient();
  await supabase.from("audit_logs").insert({ actor_id: actorId, action, entity_type: entityType, entity_id: entityId, metadata });
}

function revalidatePeople(userId?: string) {
  revalidatePath("/admin/users");
  revalidatePath("/admin/user-directory");
  if (userId) revalidatePath(`/admin/users/${userId}`);
}

function revalidateBooking(bookingId: string) {
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

// ── Contact ─────────────────────────────────────────────────────────────

export async function contactUser(input: { userId: string; subject: string; body: string; channel: "email" | "in-app" | "both"; bookingId?: string }): Promise<AdminPeopleResult> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, message: "Only admins can message users." };
  const subject = input.subject.trim().slice(0, 200);
  const body = input.body.trim().slice(0, 5000);
  if (!UUID.test(input.userId) || !subject || !body) return { ok: false, message: "Add a subject and a message." };

  const results: string[] = [];
  if (input.channel !== "email") {
    const { error } = await getServiceRoleClient()
      .from("notifications")
      .insert({ user_id: input.userId, category: "Announcement", text: `${subject}: ${body}`.slice(0, 1000), related_booking_id: input.bookingId && UUID.test(input.bookingId) ? input.bookingId : null });
    if (error) return { ok: false, message: "We couldn't post the in-app message. Please try again." };
    results.push("in-app");
  }
  if (input.channel !== "in-app") {
    const sent = await notifyUser(input.userId, { category: "security", title: subject, body, details: [`Sent by ${admin.name}, Ensena team.`] }, { force: "email" });
    if (sent.email === "unavailable") return { ok: results.length > 0, message: results.length ? "Posted in-app. Email isn't set up on this server, so no email went out." : "Email isn't set up on this server (RESEND_API_KEY)." };
    if (sent.email !== "sent") return { ok: results.length > 0, message: results.length ? "Posted in-app, but the email failed to send." : "The email failed to send. Please try again." };
    results.push("email");
  }

  await audit(admin.id, "user.contacted", "profile", input.userId, { subject, channel: input.channel, bookingId: input.bookingId ?? null });
  return { ok: true, message: `Message sent (${results.join(" + ")}).` };
}

// ── Restrictions ────────────────────────────────────────────────────────

const typeCopy = {
  Warning: { title: "A warning on your Ensena account", verb: "warned" },
  MessagingRestriction: { title: "Messaging on your Ensena account is restricted", verb: "messaging restricted" },
  Suspension: { title: "Your Ensena account has been suspended", verb: "suspended" },
} as const;

export async function restrictUser(input: { userId: string; type: keyof typeof typeCopy; reason: string; days: number | null; notify: boolean }): Promise<AdminPeopleResult> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, message: "Only admins can restrict accounts." };
  const reason = input.reason.trim();
  if (!UUID.test(input.userId) || !(input.type in typeCopy)) return { ok: false, message: "Invalid request." };
  if (!reason) return { ok: false, message: "Add a reason — the user sees it." };
  if (input.userId === admin.id) return { ok: false, message: "You can't restrict your own account." };

  const days = input.type === "Warning" ? null : input.days && input.days > 0 ? Math.min(input.days, 3650) : null;
  const endAt = days ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
  const durationLabel = input.type === "Warning" ? null : days ? `${days} day${days === 1 ? "" : "s"}` : "Until lifted";

  const supabase = await getSupabaseServerClient();
  const { data: current } = await supabase
    .from("account_restrictions")
    .select("id")
    .eq("actor_id", input.userId)
    .eq("type", input.type)
    .eq("status", "active")
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.rpc("apply_account_restriction", {
    p_actor_id: input.userId,
    p_type: input.type,
    p_reason: reason,
    p_end_at: endAt,
    p_duration_label: durationLabel,
    p_supersedes_id: current?.id ?? null,
  });
  if (error) return { ok: false, message: error.message.includes("Not authorized") ? "You don't have permission to restrict accounts." : "We couldn't apply that. Please try again." };

  if (input.notify) {
    await notifyUser(
      input.userId,
      {
        category: "security",
        title: typeCopy[input.type].title,
        body: reason,
        details: durationLabel ? [`Duration: ${durationLabel}.`, "If you think this is a mistake, reply to support@ensena.co."] : ["If you think this is a mistake, reply to support@ensena.co."],
      },
      { security: true }
    ).catch(() => null);
  }
  await audit(admin.id, `user.${input.type.toLowerCase()}`, "profile", input.userId, { reason, durationLabel });
  revalidatePeople(input.userId);
  return { ok: true, message: `Account ${typeCopy[input.type].verb}.` };
}

export async function liftRestriction(input: { restrictionId: string; userId: string; reason: string; notify: boolean }): Promise<AdminPeopleResult> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, message: "Only admins can lift restrictions." };
  if (!UUID.test(input.restrictionId) || !UUID.test(input.userId)) return { ok: false, message: "Invalid request." };
  const reason = input.reason.trim() || "Lifted by an admin";

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("resolve_account_restriction", { p_restriction_id: input.restrictionId, p_resolution_reason: reason });
  if (error) return { ok: false, message: error.message.includes("Not authorized") ? "You don't have permission to lift restrictions." : "We couldn't lift that. Please try again." };

  if (input.notify) {
    await notifyUser(input.userId, { category: "security", title: "Your Ensena account restriction was lifted", body: "Your account is back to full access. Thanks for your patience." }, { security: true }).catch(() => null);
  }
  await audit(admin.id, "user.restriction_lifted", "profile", input.userId, { restrictionId: input.restrictionId, reason });
  revalidatePeople(input.userId);
  return { ok: true, message: "Restriction lifted." };
}

// ── Bookings ────────────────────────────────────────────────────────────

async function bookingParties(bookingId: string): Promise<{ kind: "private" | "group" | "discovery"; studentId: string; tutorId: string | null; subject: string } | null> {
  const supabase = await getSupabaseServerClient();
  const { data: lesson } = await supabase.from("private_lessons").select("student_id, tutor_id, subject").eq("id", bookingId).maybeSingle();
  if (lesson) return { kind: "private", studentId: lesson.student_id, tutorId: lesson.tutor_id, subject: lesson.subject };
  const { data: enrollment } = await supabase.from("group_class_enrollments").select("student_id, cohort_id").eq("id", bookingId).maybeSingle();
  if (enrollment) {
    const { data: cohort } = await supabase.from("group_class_cohorts").select("group_class_id").eq("id", enrollment.cohort_id).maybeSingle();
    const { data: klass } = cohort ? await supabase.from("group_classes").select("tutor_id, title").eq("id", cohort.group_class_id).maybeSingle() : { data: null };
    return { kind: "group", studentId: enrollment.student_id, tutorId: klass?.tutor_id ?? null, subject: klass?.title ?? "group class" };
  }
  const { data: discovery } = await supabase.from("discovery_sessions").select("student_id, tutor_id, subject").eq("id", bookingId).maybeSingle();
  if (discovery) return { kind: "discovery", studentId: discovery.student_id, tutorId: discovery.tutor_id, subject: discovery.subject };
  return null;
}

async function tellParties(parties: { studentId: string; tutorId: string | null }, bookingId: string, text: string, studentUrl: string, tutorUrl: string) {
  const rows = [
    { user_id: parties.studentId, category: "Booking", text, action_url: studentUrl, related_booking_id: bookingId },
    ...(parties.tutorId ? [{ user_id: parties.tutorId, category: "Booking", text, action_url: tutorUrl, related_booking_id: bookingId }] : []),
  ];
  await getServiceRoleClient().from("notifications").insert(rows);
}

export async function adminCancelBooking(input: { bookingId: string; reason: string; notify: boolean }): Promise<AdminPeopleResult> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, message: "Only admins can cancel bookings." };
  const reason = input.reason.trim();
  if (!UUID.test(input.bookingId)) return { ok: false, message: "Invalid booking." };
  if (!reason) return { ok: false, message: "Add a reason for the cancellation." };
  const parties = await bookingParties(input.bookingId);
  if (!parties) return { ok: false, message: "Booking not found." };

  const supabase = await getSupabaseServerClient();
  let error: { message: string } | null = null;
  if (parties.kind === "private") ({ error } = await supabase.rpc("cancel_private_lesson", { p_lesson_id: input.bookingId, p_reason: `Cancelled by Ensena: ${reason}` }));
  else if (parties.kind === "group") ({ error } = await supabase.rpc("cancel_group_class_enrollment", { p_enrollment_id: input.bookingId, p_reason: `Cancelled by Ensena: ${reason}` }));
  else {
    const { data, error: e } = await supabase.from("discovery_sessions").update({ status: "Cancelled" }).eq("id", input.bookingId).in("status", ["Scheduled"]).select("id");
    error = e ?? (data?.length ? null : { message: "This session can no longer be cancelled" });
  }
  if (error) {
    const msg = error.message;
    return { ok: false, message: /no longer|not found/i.test(msg) ? msg : /Not authorized/i.test(msg) ? "You don't have permission to cancel bookings." : "We couldn't cancel this booking. Please try again." };
  }

  if (input.notify) {
    await tellParties(parties, input.bookingId, `Your ${parties.subject} booking was cancelled by the Ensena team. Reason: ${reason}`, "/student-dashboard/lessons", "/tutor-dashboard").catch(() => null);
  }
  await audit(admin.id, "booking.cancelled", parties.kind, input.bookingId, { reason });
  revalidateBooking(input.bookingId);
  return { ok: true, message: "Booking cancelled." };
}

export async function adminRescheduleBooking(input: { bookingId: string; newStartISO: string; notify: boolean }): Promise<AdminPeopleResult> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, message: "Only admins can reschedule bookings." };
  const when = new Date(input.newStartISO);
  if (!UUID.test(input.bookingId) || Number.isNaN(when.getTime())) return { ok: false, message: "Pick a valid new date and time." };
  if (when.getTime() < Date.now() + 15 * 60_000) return { ok: false, message: "Pick a time at least 15 minutes from now." };
  const parties = await bookingParties(input.bookingId);
  if (!parties || parties.kind !== "private") return { ok: false, message: "Only private lessons can be rescheduled here." };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("reschedule_private_lesson", { p_lesson_id: input.bookingId, p_new_scheduled_at: when.toISOString() });
  if (error) {
    const msg = error.message;
    return { ok: false, message: /not available|no longer/i.test(msg) ? msg : /Not authorized/i.test(msg) ? "You don't have permission to reschedule bookings." : "We couldn't reschedule this lesson. Please try again." };
  }

  if (input.notify) {
    const label = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(when);
    await tellParties(parties, input.bookingId, `The Ensena team moved your ${parties.subject} lesson to ${label} (WAT).`, "/student-dashboard/lessons", `/tutor-dashboard/classroom/private/${input.bookingId}`).catch(() => null);
  }
  await audit(admin.id, "booking.rescheduled", "private", input.bookingId, { newStart: when.toISOString() });
  revalidateBooking(input.bookingId);
  return { ok: true, message: "Lesson rescheduled." };
}

export async function addBookingNote(input: { bookingId: string; note: string }): Promise<AdminPeopleResult> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, message: "Only admins can add notes." };
  const note = input.note.trim().slice(0, 2000);
  if (!UUID.test(input.bookingId) || !note) return { ok: false, message: "Write a note first." };
  const parties = await bookingParties(input.bookingId);
  if (!parties || parties.kind === "discovery") return { ok: false, message: "Notes can be added to private lessons and group enrollments." };

  const column = parties.kind === "private" ? "private_lesson_id" : "group_class_enrollment_id";
  const { error } = await getServiceRoleClient().from("booking_events").insert({ [column]: input.bookingId, event_type: "admin_note", actor_id: admin.id, note });
  if (error) return { ok: false, message: "We couldn't save the note. Please try again." };
  revalidateBooking(input.bookingId);
  return { ok: true, message: "Note saved." };
}
