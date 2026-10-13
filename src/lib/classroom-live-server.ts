// Server-only: builds a classroom straight from the database for the real
// (Supabase) app — the booking row decides who may enter and whether a
// student has paid, so neither depends on anything stored in a browser.
// Tutor and student both resolve to the same `${kind}:${id}` classroomId,
// which is the Supabase Realtime channel the video, whiteboard and chat
// ride on (see classroom-sync.ts) — so they genuinely meet in one room.
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { STUDENT_ENTRY_WINDOW_MS, TUTOR_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import type { ClassroomKind, ClassroomParticipantView, ClassroomRole, ClassroomSession } from "@/lib/classroom-data";

export type LiveClassroomResult =
  | { status: "ok"; session: ClassroomSession }
  | { status: "not-found" }
  | { status: "too-early"; opensAtMs: number; title: string }
  | { status: "ended"; title: string }
  | { status: "cancelled"; title: string };

const LAB_SUBJECTS = new Set(["Physics", "Chemistry", "Biology"]);
/** How long after the scheduled end the room stays open (overruns, rejoining). */
const GRACE_AFTER_END_MS = 30 * 60_000;
const UUID = /^[0-9a-f-]{36}$/i;

type Person = { id: string; full_name: string | null; avatar_url: string | null };

const fmtDate = (ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric" }).format(ms);
const fmtTime = (ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit" }).format(ms);

function participant(p: { id: string; name: string; image: string | null; role: "tutor" | "student"; isSelf: boolean }): ClassroomParticipantView {
  return { id: p.isSelf ? "self" : p.id, name: p.name, image: p.image ?? undefined, role: p.role, isSelf: p.isSelf, micOn: true, camOn: p.role === "tutor", handRaised: false };
}

function windowCheck(role: ClassroomRole, startMs: number, endMs: number, title: string): LiveClassroomResult | null {
  const now = Date.now();
  const opensAtMs = startMs - (role === "tutor" ? TUTOR_ENTRY_WINDOW_MS : STUDENT_ENTRY_WINDOW_MS);
  if (now < opensAtMs) return { status: "too-early", opensAtMs, title };
  if (now > endMs + GRACE_AFTER_END_MS) return { status: "ended", title };
  return null;
}

async function people(ids: (string | null | undefined)[]): Promise<Map<string, Person>> {
  const list = [...new Set(ids.filter((id): id is string => !!id))];
  if (list.length === 0) return new Map();
  const { data } = await getServiceRoleClient().from("profiles").select("id, full_name, avatar_url").in("id", list);
  return new Map(((data ?? []) as Person[]).map((p) => [p.id, p]));
}

const nameOf = (p: Person | undefined, fallback: string) => p?.full_name?.trim() || fallback;

function base(opts: {
  kind: ClassroomKind;
  id: string;
  role: ClassroomRole;
  bookingReference: string;
  subject: string;
  title: string;
  typeLabel: ClassroomSession["typeLabel"];
  startMs: number;
  durationMinutes: number;
  mode: string;
  tutor: { name: string; image: string | null };
  student?: { name: string; image: string | null };
  participants: ClassroomParticipantView[];
  participantCount: number;
  materials?: string[];
  amountGross: number;
  hasPaymentAccess?: boolean;
  seatsLabel?: string;
  topic?: string;
  liveSessionId?: string;
}): ClassroomSession {
  const lab = LAB_SUBJECTS.has(opts.subject) ? (opts.subject as "Physics" | "Chemistry" | "Biology") : undefined;
  return {
    kind: opts.kind,
    id: opts.id,
    classroomId: `${opts.kind}:${opts.id}`,
    role: opts.role,
    bookingReference: opts.bookingReference,
    subject: opts.subject,
    topic: opts.topic,
    title: opts.title,
    typeLabel: opts.typeLabel,
    tutorName: opts.tutor.name,
    tutorImage: opts.tutor.image ?? undefined,
    studentName: opts.student?.name,
    studentImage: opts.student?.image ?? undefined,
    date: fmtDate(opts.startMs),
    time: fmtTime(opts.startMs),
    durationLabel: `${opts.durationMinutes} min`,
    durationMinutesNumeric: opts.durationMinutes,
    // Real wall-clock end, so the timer counts down to the actual scheduled end.
    scheduledEndAtISO: new Date(opts.startMs + opts.durationMinutes * 60_000).toISOString(),
    mode: opts.mode === "Online" ? "Online" : "Physical",
    seatsLabel: opts.seatsLabel,
    materials: opts.materials ?? [],
    participantCount: opts.participantCount,
    participants: opts.participants,
    chatSeed: [],
    labApplies: lab !== undefined,
    labSubject: lab,
    amountGross: opts.amountGross,
    hasPaymentAccess: opts.hasPaymentAccess,
    live: true,
    liveSessionId: opts.liveSessionId,
  };
}

export async function loadLiveClassroom(kind: ClassroomKind, id: string, viewer: { id: string; role: ClassroomRole }): Promise<LiveClassroomResult> {
  if (!UUID.test(id)) return { status: "not-found" };
  const admin = getServiceRoleClient();

  if (kind === "private") {
    const { data: l } = await admin.from("private_lessons").select("*").eq("id", id).maybeSingle();
    if (!l || (viewer.role === "student" ? l.student_id : l.tutor_id) !== viewer.id) return { status: "not-found" };
    if (l.status === "Cancelled") return { status: "cancelled", title: l.subject };
    const startMs = new Date(l.scheduled_at).getTime();
    const duration = l.duration_minutes || 60;
    const blocked = l.status === "Completed" ? ({ status: "ended", title: l.subject } as const) : windowCheck(viewer.role, startMs, startMs + duration * 60_000, l.subject);
    if (blocked) return blocked;
    const who = await people([l.tutor_id, l.student_id]);
    const tutor = { name: nameOf(who.get(l.tutor_id), "Tutor"), image: who.get(l.tutor_id)?.avatar_url ?? null };
    const student = { name: nameOf(who.get(l.student_id), "Student"), image: who.get(l.student_id)?.avatar_url ?? null };
    const materials = Array.isArray(l.materials) ? (l.materials as unknown[]).filter((m): m is string => typeof m === "string") : [];
    return {
      status: "ok",
      session: base({
        kind,
        id,
        role: viewer.role,
        bookingReference: l.booking_reference,
        subject: l.subject,
        title: l.subject,
        typeLabel: "Private Lesson",
        startMs,
        durationMinutes: duration,
        mode: l.mode,
        tutor,
        student,
        participantCount: 2,
        participants: [
          participant({ id: l.tutor_id, name: tutor.name, image: tutor.image, role: "tutor", isSelf: viewer.role === "tutor" }),
          participant({ id: l.student_id, name: student.name, image: student.image, role: "student", isSelf: viewer.role === "student" }),
        ],
        materials,
        amountGross: Number(l.price) || 0,
        hasPaymentAccess: viewer.role === "student" ? l.payment_status === "paid" : undefined,
      }),
    };
  }

  if (kind === "discovery") {
    const { data: d } = await admin.from("discovery_sessions").select("*").eq("id", id).maybeSingle();
    if (!d || (viewer.role === "student" ? d.student_id : d.tutor_id) !== viewer.id) return { status: "not-found" };
    if (d.status === "Cancelled") return { status: "cancelled", title: "Discovery Session" };
    const startMs = new Date(d.scheduled_start_at).getTime();
    const endMs = new Date(d.scheduled_end_at).getTime();
    const blocked = d.status === "Completed" || d.status === "NoShow" ? ({ status: "ended", title: "Discovery Session" } as const) : windowCheck(viewer.role, startMs, endMs, "Discovery Session");
    if (blocked) return blocked;
    const who = await people([d.tutor_id, d.student_id]);
    const tutor = { name: nameOf(who.get(d.tutor_id), "Tutor"), image: who.get(d.tutor_id)?.avatar_url ?? null };
    const student = { name: nameOf(who.get(d.student_id), "Student"), image: who.get(d.student_id)?.avatar_url ?? null };
    return {
      status: "ok",
      session: base({
        kind,
        id,
        role: viewer.role,
        bookingReference: d.booking_reference,
        subject: d.subject,
        title: "Discovery Session",
        typeLabel: "Discovery Session",
        startMs,
        durationMinutes: Math.max(1, Math.round((endMs - startMs) / 60_000)),
        mode: "Online",
        tutor,
        student,
        participantCount: 2,
        participants: [
          participant({ id: d.tutor_id ?? "tutor", name: tutor.name, image: tutor.image, role: "tutor", isSelf: viewer.role === "tutor" }),
          participant({ id: d.student_id, name: student.name, image: student.image, role: "student", isSelf: viewer.role === "student" }),
        ],
        amountGross: 0,
      }),
    };
  }

  if (kind === "counselling") {
    if (viewer.role !== "student") return { status: "not-found" };
    const { data: c } = await admin.from("counselling_appointments").select("*").eq("id", id).maybeSingle();
    if (!c || c.student_id !== viewer.id) return { status: "not-found" };
    if (c.status === "Cancelled") return { status: "cancelled", title: "Counselling Session" };
    const startMs = new Date(c.scheduled_at).getTime();
    const duration = c.duration_minutes || 30;
    const blocked = c.status === "Completed" ? ({ status: "ended", title: "Counselling Session" } as const) : windowCheck("student", startMs, startMs + duration * 60_000, "Counselling Session");
    if (blocked) return blocked;
    const who = await people([c.counsellor_id, c.student_id]);
    const counsellor = { name: nameOf(who.get(c.counsellor_id), "Your counsellor"), image: who.get(c.counsellor_id)?.avatar_url ?? null };
    const student = { name: nameOf(who.get(c.student_id), "Student"), image: who.get(c.student_id)?.avatar_url ?? null };
    return {
      status: "ok",
      session: base({
        kind,
        id,
        role: "student",
        bookingReference: c.booking_reference,
        subject: "Counselling",
        title: "Counselling Session",
        typeLabel: "Counselling Session",
        startMs,
        durationMinutes: duration,
        mode: "Online",
        tutor: counsellor,
        student,
        participantCount: 2,
        participants: [
          participant({ id: c.counsellor_id ?? "counsellor", name: counsellor.name, image: counsellor.image, role: "tutor", isSelf: false }),
          participant({ id: c.student_id, name: student.name, image: student.image, role: "student", isSelf: true }),
        ],
        amountGross: 0,
      }),
    };
  }

  // Group: `id` is the group class. The room is for its current/next session.
  const { data: cls } = await admin.from("group_classes").select("*").eq("id", id).maybeSingle();
  if (!cls) return { status: "not-found" };
  const { data: cohorts } = await admin.from("group_class_cohorts").select("*").eq("group_class_id", id);
  const cohortRows = (cohorts ?? []) as { id: string; price: number; schedule: Record<string, unknown> | null; seats_total: number; seats_filled: number }[];
  let cohortIds = cohortRows.map((c) => c.id);
  if (viewer.role === "student") {
    const { data: enrolment } = cohortIds.length
      ? await admin.from("group_class_enrollments").select("cohort_id").in("cohort_id", cohortIds).eq("student_id", viewer.id).eq("status", "Active")
      : { data: [] };
    cohortIds = ((enrolment ?? []) as { cohort_id: string }[]).map((e) => e.cohort_id);
    if (cohortIds.length === 0) return { status: "not-found" };
  } else if (cls.tutor_id !== viewer.id) {
    return { status: "not-found" };
  }
  if (cohortIds.length === 0) return { status: "ended", title: cls.title };
  const nowIso = new Date(Date.now() - GRACE_AFTER_END_MS - 4 * 3_600_000).toISOString();
  const { data: sessions } = await admin.from("group_class_sessions").select("*").in("cohort_id", cohortIds).eq("status", "Scheduled").gte("scheduled_at", nowIso).order("scheduled_at").limit(1);
  const s = (sessions ?? [])[0] as { id: string; cohort_id: string; scheduled_at: string; session_number: number } | undefined;
  if (!s) return { status: "ended", title: cls.title };
  const cohort = cohortRows.find((c) => c.id === s.cohort_id)!;
  const schedule = cohort.schedule ?? {};
  const duration = Number(schedule.durationMinutes ?? schedule.duration_minutes ?? schedule.duration) || 60;
  const startMs = new Date(s.scheduled_at).getTime();
  const blocked = windowCheck(viewer.role, startMs, startMs + duration * 60_000, cls.title);
  if (blocked) return blocked;

  const { data: roster } = await admin.from("group_class_enrollments").select("student_id").eq("cohort_id", cohort.id).eq("status", "Active");
  const studentIds = ((roster ?? []) as { student_id: string }[]).map((r) => r.student_id);
  const who = await people([cls.tutor_id, ...studentIds]);
  const tutor = { name: nameOf(who.get(cls.tutor_id), "Tutor"), image: who.get(cls.tutor_id)?.avatar_url ?? null };
  const me = viewer.role === "student" ? { name: nameOf(who.get(viewer.id), "You"), image: who.get(viewer.id)?.avatar_url ?? null } : undefined;
  const { count: totalSessions } = await admin.from("group_class_sessions").select("id", { count: "exact", head: true }).eq("cohort_id", cohort.id);
  return {
    status: "ok",
    session: base({
      kind: "group",
      id,
      role: viewer.role,
      bookingReference: cls.slug,
      subject: cls.subject,
      title: cls.title,
      topic: `Session ${s.session_number}`,
      typeLabel: "Group Class",
      startMs,
      durationMinutes: duration,
      mode: cls.mode,
      tutor,
      student: me,
      participantCount: studentIds.length + 1,
      // Classmates are listed by first name only.
      participants: [
        participant({ id: cls.tutor_id, name: tutor.name, image: tutor.image, role: "tutor", isSelf: viewer.role === "tutor" }),
        ...studentIds.map((sid) =>
          participant({ id: sid, name: sid === viewer.id ? nameOf(who.get(sid), "You") : nameOf(who.get(sid), "Student").split(" ")[0], image: who.get(sid)?.avatar_url ?? null, role: "student", isSelf: sid === viewer.id })
        ),
      ],
      amountGross: totalSessions ? Math.round(Number(cohort.price) / totalSessions) : 0,
      seatsLabel: `${cohort.seats_filled}/${cohort.seats_total} students`,
      liveSessionId: s.id,
    }),
  };
}
