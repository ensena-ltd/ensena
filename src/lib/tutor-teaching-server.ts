// Server-only: everything a signed-in tutor teaches — private lessons,
// group classes (cohorts, sessions, rosters), discovery sessions — and the
// students behind them, read from Supabase for ONE tutor. Students' names
// and photos live on their own profiles, which RLS hides from tutors, so
// this uses the service-role client, always filtered to `tutorId`.
import { splitEarnings } from "@/lib/commission";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { UNPAID_HOLD_MINUTES } from "@/lib/booking-slots";

export type LessonStatus = "Upcoming" | "Pending" | "Completed" | "Cancelled";

export interface TeachingLesson {
  id: string;
  studentId: string;
  studentName: string;
  studentImage: string | null;
  subject: string;
  academicLevel: string | null;
  startMs: number;
  endMs: number;
  durationMinutes: number;
  mode: string;
  status: LessonStatus;
  paymentStatus: string;
  /** An unpaid booking whose checkout hold ran out — the slot is free again. */
  holdExpired: boolean;
  price: number;
  bookingReference: string | null;
  seriesId: string | null;
  frequency: string | null;
  sessionNumber: number | null;
  totalSessions: number | null;
  notes: string | null;
  cancellationReason: string | null;
  cancelledAtMs: number | null;
  /** The escrow record's state once the lesson was completed (paid lessons only). */
  confirmation: { status: string; escrow: string } | null;
}

export interface TeachingDiscovery {
  id: string;
  studentId: string | null;
  studentName: string;
  studentImage: string | null;
  subject: string;
  startMs: number;
  endMs: number;
  status: string;
  bookingReference: string | null;
}

export interface TeachingRosterEntry {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentImage: string | null;
  status: string;
  bookingReference: string;
  enrolledAtMs: number;
}

export interface TeachingGroupSession {
  id: string;
  number: number;
  startMs: number;
  endMs: number;
  status: string;
}

export interface TeachingCohort {
  id: string;
  index: number;
  startDate: string;
  endDate: string | null;
  days: number[];
  time: string | null;
  durationMinutes: number;
  seatsTotal: number;
  seatsFilled: number;
  price: number;
  status: string;
  sessions: TeachingGroupSession[];
  roster: TeachingRosterEntry[];
}

export interface TeachingGroupClass {
  id: string;
  slug: string;
  title: string;
  subject: string;
  academicLevel: string | null;
  mode: string;
  language: string;
  description: string;
  learningOutcomes: string[];
  status: string;
  createdAtMs: number;
  cohorts: TeachingCohort[];
}

export interface BlockedSlot {
  id: string;
  startMs: number;
  endMs: number;
  reason: string | null;
}

export type AttentionReason = "unpaid" | "disputed" | "inactive" | "cancellations" | "homework";

export interface TeachingStudent {
  id: string;
  name: string;
  image: string | null;
  academicLevel: string;
  subjects: string[];
  types: ("Private" | "Group" | "Discovery")[];
  completedLessons: number;
  upcomingLessons: number;
  cancelledLessons: number;
  nextLessonMs: number | null;
  lastLessonMs: number | null;
  firstLessonMs: number | null;
  /** What this tutor has earned from the student, after commission. */
  netEarned: number;
  homeworkOpen: number;
  homeworkOverdue: number;
  attention: { reason: AttentionReason; text: string }[];
}

export interface HomeworkRow {
  id: string;
  studentId: string;
  title: string;
  subject: string;
  status: string;
  dueMs: number | null;
  submittedMs: number | null;
  grade: string | null;
}

export interface TeachingSnapshot {
  generatedAtMs: number;
  lessons: TeachingLesson[];
  discovery: TeachingDiscovery[];
  groupClasses: TeachingGroupClass[];
  blocked: BlockedSlot[];
  students: TeachingStudent[];
  homework: HomeworkRow[];
  /** Whether this tutor's application is approved (only then can classes go live). */
  approved: boolean;
}

type Row = Record<string, unknown>;
type Person = { id: string; full_name: string | null; avatar_url: string | null };

const ms = (v: unknown): number => (typeof v === "string" ? new Date(v).getTime() : 0);
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

const INACTIVE_DAYS = 30;

export function cohortSchedule(schedule: unknown): { days: number[]; time: string | null; durationMinutes: number } {
  const s = (schedule && typeof schedule === "object" ? schedule : {}) as Row;
  const duration = num(s.durationMinutes ?? s.duration_minutes ?? s.duration);
  const days = Array.isArray(s.days) ? (s.days as unknown[]).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
  return { days, time: strOrNull(s.time) ?? strOrNull(s.startTime), durationMinutes: duration > 0 ? duration : 60 };
}

export async function loadTutorTeaching(tutorId: string): Promise<TeachingSnapshot> {
  try {
    return await load(tutorId);
  } catch (error) {
    console.error("loadTutorTeaching failed", error);
    return { generatedAtMs: Date.now(), lessons: [], discovery: [], groupClasses: [], blocked: [], students: [], homework: [], approved: false };
  }
}

async function load(tutorId: string): Promise<TeachingSnapshot> {
  const admin = getServiceRoleClient();
  const nowMs = Date.now();

  const [
    { data: lessonRows },
    { data: discoveryRows },
    { data: classRows },
    { data: blockedRows },
    { data: confirmationRows },
    { data: homeworkRows },
    { data: tutor },
  ] = await Promise.all([
    admin.from("private_lessons").select("*").eq("tutor_id", tutorId).order("scheduled_at"),
    admin.from("discovery_sessions").select("id, student_id, subject, scheduled_start_at, scheduled_end_at, status, booking_reference").eq("tutor_id", tutorId).order("scheduled_start_at"),
    admin.from("group_classes").select("*").eq("tutor_id", tutorId).order("created_at", { ascending: false }),
    admin.from("tutor_blocked_time").select("id, start_at, end_at, reason").eq("tutor_id", tutorId).gte("end_at", new Date(nowMs - 7 * 86_400_000).toISOString()).order("start_at"),
    admin.from("lesson_confirmations").select("student_id, type, subject, amount_gross, completed_at, confirmation_status, escrow_status").eq("tutor_id", tutorId),
    admin.from("homework_items").select("id, student_id, title, subject, status, due_at, submitted_at, grade").eq("tutor_id", tutorId).order("due_at", { nullsFirst: false }),
    admin.from("tutor_profiles").select("application_status").eq("id", tutorId).maybeSingle(),
  ]);

  const lessons = (lessonRows ?? []) as Row[];
  const discoveries = (discoveryRows ?? []) as Row[];
  const classes = (classRows ?? []) as Row[];
  const confirmations = (confirmationRows ?? []) as Row[];

  const classIds = classes.map((c) => c.id as string);
  const { data: cohortRows } = classIds.length ? await admin.from("group_class_cohorts").select("*").in("group_class_id", classIds).order("cohort_index") : { data: [] };
  const cohorts = (cohortRows ?? []) as Row[];
  const cohortIds = cohorts.map((c) => c.id as string);
  const [{ data: sessionRows }, { data: enrollmentRows }] = cohortIds.length
    ? await Promise.all([
        admin.from("group_class_sessions").select("id, cohort_id, session_number, scheduled_at, status").in("cohort_id", cohortIds).order("scheduled_at"),
        admin.from("group_class_enrollments").select("id, cohort_id, student_id, status, booking_reference, enrolled_at").in("cohort_id", cohortIds),
      ])
    : [{ data: [] }, { data: [] }];
  const sessions = (sessionRows ?? []) as Row[];
  const enrollments = (enrollmentRows ?? []) as Row[];

  const studentIds = new Set<string>();
  lessons.forEach((l) => studentIds.add(l.student_id as string));
  discoveries.forEach((d) => d.student_id && studentIds.add(d.student_id as string));
  enrollments.forEach((e) => studentIds.add(e.student_id as string));
  const ids = [...studentIds];
  const [{ data: peopleRows }, { data: studentRows }] = ids.length
    ? await Promise.all([
        admin.from("profiles").select("id, full_name, avatar_url").in("id", ids),
        admin.from("student_profiles").select("id, academic_level, academic_detail").in("id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const people = new Map(((peopleRows ?? []) as Person[]).map((p) => [p.id, p]));
  const levels = new Map(((studentRows ?? []) as Row[]).map((s) => [s.id as string, (strOrNull(s.academic_detail) ?? strOrNull(s.academic_level) ?? "") as string]));
  const nameOf = (id: unknown) => (typeof id === "string" && people.get(id)?.full_name?.trim()) || "Student";
  const imageOf = (id: unknown) => (typeof id === "string" ? people.get(id)?.avatar_url ?? null : null);

  const holdCutoff = nowMs - UNPAID_HOLD_MINUTES * 60_000;
  const teachingLessons: TeachingLesson[] = lessons.map((l) => {
    const startMs = ms(l.scheduled_at);
    const duration = num(l.duration_minutes) || 60;
    const completedAt = startMs + duration * 60_000;
    const confirmation =
      l.status === "Completed"
        ? confirmations.find((c) => c.type === "Private" && c.student_id === l.student_id && c.subject === l.subject && Math.abs(ms(c.completed_at) - completedAt) < 24 * 3_600_000)
        : undefined;
    return {
      id: l.id as string,
      studentId: l.student_id as string,
      studentName: nameOf(l.student_id),
      studentImage: imageOf(l.student_id),
      subject: l.subject as string,
      academicLevel: strOrNull(l.academic_level),
      startMs,
      endMs: startMs + duration * 60_000,
      durationMinutes: duration,
      mode: (l.mode as string) ?? "Online",
      status: (l.status as LessonStatus) ?? "Upcoming",
      paymentStatus: (l.payment_status as string) ?? "unpaid",
      holdExpired: l.status === "Pending" && l.payment_status === "unpaid" && ms(l.updated_at) < holdCutoff,
      price: num(l.price),
      bookingReference: strOrNull(l.booking_reference),
      seriesId: strOrNull(l.booking_group_id),
      frequency: strOrNull(l.frequency),
      sessionNumber: (l.session_number as number) ?? null,
      totalSessions: (l.total_sessions as number) ?? null,
      notes: strOrNull(l.notes),
      cancellationReason: strOrNull(l.cancellation_reason),
      cancelledAtMs: l.cancelled_at ? ms(l.cancelled_at) : null,
      confirmation: confirmation ? { status: confirmation.confirmation_status as string, escrow: confirmation.escrow_status as string } : null,
    };
  });

  const teachingDiscovery: TeachingDiscovery[] = discoveries.map((d) => {
    const startMs = ms(d.scheduled_start_at);
    return {
      id: d.id as string,
      studentId: strOrNull(d.student_id),
      studentName: d.student_id ? nameOf(d.student_id) : "Student",
      studentImage: imageOf(d.student_id),
      subject: (d.subject as string) ?? "",
      startMs,
      endMs: ms(d.scheduled_end_at) || startMs + 25 * 60_000,
      status: (d.status as string) ?? "Scheduled",
      bookingReference: strOrNull(d.booking_reference),
    };
  });

  const groupClasses: TeachingGroupClass[] = classes.map((c) => ({
    id: c.id as string,
    slug: c.slug as string,
    title: c.title as string,
    subject: c.subject as string,
    academicLevel: strOrNull(c.class_grade) ?? strOrNull(c.academic_level),
    mode: (c.mode as string) ?? "Online",
    language: (c.language as string) ?? "English",
    description: (c.description as string) ?? "",
    learningOutcomes: strings(c.learning_outcomes),
    status: c.status as string,
    createdAtMs: ms(c.created_at),
    cohorts: cohorts
      .filter((k) => k.group_class_id === c.id)
      .map((k) => {
        const sched = cohortSchedule(k.schedule);
        return {
          id: k.id as string,
          index: num(k.cohort_index),
          startDate: k.start_date as string,
          endDate: strOrNull(k.end_date),
          days: sched.days,
          time: sched.time,
          durationMinutes: sched.durationMinutes,
          seatsTotal: num(k.seats_total),
          seatsFilled: num(k.seats_filled),
          price: num(k.price),
          status: k.status as string,
          sessions: sessions
            .filter((s) => s.cohort_id === k.id)
            .map((s) => {
              const startMs = ms(s.scheduled_at);
              return { id: s.id as string, number: num(s.session_number), startMs, endMs: startMs + sched.durationMinutes * 60_000, status: s.status as string };
            }),
          roster: enrollments
            .filter((e) => e.cohort_id === k.id && e.status !== "Waitlisted")
            .map((e) => ({
              enrollmentId: e.id as string,
              studentId: e.student_id as string,
              studentName: nameOf(e.student_id),
              studentImage: imageOf(e.student_id),
              status: e.status as string,
              bookingReference: e.booking_reference as string,
              enrolledAtMs: ms(e.enrolled_at),
            })),
        };
      }),
  }));

  const homework: HomeworkRow[] = ((homeworkRows ?? []) as Row[]).map((h) => ({
    id: h.id as string,
    studentId: h.student_id as string,
    title: h.title as string,
    subject: h.subject as string,
    status: h.status as string,
    dueMs: h.due_at ? ms(h.due_at) : null,
    submittedMs: h.submitted_at ? ms(h.submitted_at) : null,
    grade: strOrNull(h.grade),
  }));

  // ── Students, derived from everything above ──
  const students: TeachingStudent[] = ids.map((id) => {
    const mine = teachingLessons.filter((l) => l.studentId === id && !l.holdExpired);
    const discovery = teachingDiscovery.filter((d) => d.studentId === id);
    const groupSessions = groupClasses.flatMap((c) =>
      c.cohorts.flatMap((k) => (k.roster.some((r) => r.studentId === id && r.status !== "Cancelled") ? k.sessions.map((s) => ({ ...s, title: c.title, subject: c.subject })) : []))
    );
    const enrolledGroup = groupClasses.filter((c) => c.cohorts.some((k) => k.roster.some((r) => r.studentId === id)));

    const timeline = [
      ...mine.filter((l) => l.status !== "Cancelled").map((l) => ({ startMs: l.startMs, done: l.status === "Completed", future: l.status !== "Completed" && l.endMs > nowMs })),
      ...discovery.filter((d) => d.status !== "Cancelled").map((d) => ({ startMs: d.startMs, done: d.status === "Completed", future: d.status === "Scheduled" && d.endMs > nowMs })),
      ...groupSessions.filter((s) => s.status !== "Cancelled").map((s) => ({ startMs: s.startMs, done: s.status === "Completed", future: s.status === "Scheduled" && s.endMs > nowMs })),
    ];
    const done = timeline.filter((t) => t.done);
    const future = timeline.filter((t) => t.future).sort((a, b) => a.startMs - b.startMs);
    const cancelled = mine.filter((l) => l.status === "Cancelled").length;
    const hw = homework.filter((h) => h.studentId === id);
    const hwOpen = hw.filter((h) => h.status === "assigned" || h.status === "late");
    const hwOverdue = hwOpen.filter((h) => h.dueMs !== null && h.dueMs < nowMs);
    const net = confirmations
      .filter((c) => c.student_id === id && c.escrow_status !== "Frozen" && c.confirmation_status !== "Disputed")
      .reduce((sum, c) => sum + splitEarnings(num(c.amount_gross)).net, 0);
    const lastMs = done.length ? Math.max(...done.map((t) => t.startMs)) : null;
    const firstName = nameOf(id).split(" ")[0];

    const attention: TeachingStudent["attention"] = [];
    const unpaid = mine.filter((l) => l.status === "Pending" && l.paymentStatus !== "paid" && l.endMs > nowMs);
    if (unpaid.length) attention.push({ reason: "unpaid", text: `${unpaid.length} booked ${unpaid.length === 1 ? "lesson is" : "lessons are"} waiting for ${firstName}'s payment` });
    const disputed = confirmations.filter((c) => c.student_id === id && c.confirmation_status === "Disputed").length;
    if (disputed) attention.push({ reason: "disputed", text: `${firstName} reported a problem with ${disputed === 1 ? "a lesson" : `${disputed} lessons`} — Ensena support is reviewing` });
    if (lastMs && future.length === 0 && nowMs - lastMs > INACTIVE_DAYS * 86_400_000) {
      attention.push({ reason: "inactive", text: `No lesson in ${Math.floor((nowMs - lastMs) / 86_400_000)} days and nothing booked` });
    }
    if (cancelled >= 2 && cancelled >= done.length) attention.push({ reason: "cancellations", text: `${cancelled} cancelled lessons — more than completed ones` });
    if (hwOverdue.length) attention.push({ reason: "homework", text: `${hwOverdue.length} overdue homework ${hwOverdue.length === 1 ? "task" : "tasks"}` });

    const types: TeachingStudent["types"] = [];
    if (mine.length) types.push("Private");
    if (enrolledGroup.length) types.push("Group");
    if (discovery.length) types.push("Discovery");

    return {
      id,
      name: nameOf(id),
      image: imageOf(id),
      academicLevel: levels.get(id) ?? "",
      subjects: [...new Set([...mine.map((l) => l.subject), ...enrolledGroup.map((c) => c.subject), ...discovery.map((d) => d.subject).filter(Boolean)])],
      types,
      completedLessons: done.length,
      upcomingLessons: future.length,
      cancelledLessons: cancelled,
      nextLessonMs: future[0]?.startMs ?? null,
      lastLessonMs: lastMs,
      firstLessonMs: timeline.length ? Math.min(...timeline.map((t) => t.startMs)) : null,
      netEarned: net,
      homeworkOpen: hwOpen.length,
      homeworkOverdue: hwOverdue.length,
      attention,
    };
  });
  // Students whose only booking is an abandoned checkout aren't really students yet.
  const realStudents = students.filter((s) => s.types.length > 0 && (s.completedLessons > 0 || s.upcomingLessons > 0 || s.cancelledLessons > 0 || s.types.includes("Group") || s.attention.length > 0));
  realStudents.sort((a, b) => (b.nextLessonMs !== null ? 1 : 0) - (a.nextLessonMs !== null ? 1 : 0) || (a.nextLessonMs ?? 0) - (b.nextLessonMs ?? 0) || (b.lastLessonMs ?? 0) - (a.lastLessonMs ?? 0));

  return {
    generatedAtMs: nowMs,
    lessons: teachingLessons,
    discovery: teachingDiscovery,
    groupClasses,
    blocked: ((blockedRows ?? []) as Row[]).map((b) => ({ id: b.id as string, startMs: ms(b.start_at), endMs: ms(b.end_at), reason: strOrNull(b.reason) })),
    students: realStudents,
    homework,
    approved: tutor?.application_status === "approved",
  };
}
