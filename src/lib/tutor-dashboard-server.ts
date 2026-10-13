// Server-only: everything the live tutor dashboard home page shows, read
// from Supabase for ONE signed-in tutor. Students' names and photos live on
// other people's profiles, which RLS doesn't let a tutor read directly — so
// this uses the service-role client, always filtered to `tutorId`'s own rows
// (same approach as student-learning-server.ts).
import { splitEarnings } from "@/lib/commission";
import { loadInbox } from "@/lib/messages-server";
import { getPlatformTodayParts, platformWallTimeToMs } from "@/lib/platform-time";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";

export type TutorSessionKind = "private" | "group" | "discovery";
export type TutorSessionStatus = "scheduled" | "completed" | "cancelled";

export interface TutorSession {
  id: string;
  kind: TutorSessionKind;
  title: string;
  /** Private/discovery: the student's name. Group: "12 enrolled". */
  withLabel: string;
  studentImage: string | null;
  startMs: number;
  endMs: number;
  durationMinutes: number;
  mode: string;
  status: TutorSessionStatus;
  /** Private lessons only — an unpaid booking hasn't been confirmed yet. */
  paid: boolean;
  classroomHref: string;
}

export interface TutorGroupClassCard {
  id: string;
  slug: string;
  title: string;
  subject: string;
  scheduleLine: string;
  seatsFilled: number;
  seatsTotal: number;
  price: number;
  nextSessionMs: number | null;
}

export interface TutorMessagePreview {
  id: string;
  name: string;
  image: string | null;
  preview: string;
  atMs: number;
  unread: boolean;
}

export interface TutorNotificationRow {
  id: string;
  text: string;
  category: string;
  actionUrl: string | null;
  unread: boolean;
  createdAtMs: number;
}

export interface TutorEarningsSummary {
  /** Net (after commission) earned from lessons completed this platform month. */
  monthNet: number;
  monthPrivateNet: number;
  monthGroupNet: number;
  /** Net cleared from escrow, minus every payout already requested. */
  available: number;
  /** Net still inside the student's confirmation window. */
  pendingClearance: number;
  /** Net frozen by a dispute. */
  frozen: number;
}

export interface TutorPerformance {
  rating: number | null;
  reviewCount: number;
  studentsTaught: number;
  lessonsTaught: number;
  repeatStudentsPct: number;
  cancellationRatePct: number;
}

export interface TutorDashboardSnapshot {
  generatedAtMs: number;
  sessions: TutorSession[];
  groupClasses: TutorGroupClassCard[];
  totalStudents: number;
  earnings: TutorEarningsSummary;
  performance: TutorPerformance;
  messages: TutorMessagePreview[];
  unreadMessages: number;
  notifications: TutorNotificationRow[];
  unreadNotifications: number;
}

type Row = Record<string, unknown>;
type Person = { id: string; full_name: string | null; avatar_url: string | null };

const ms = (v: unknown): number => (typeof v === "string" ? new Date(v).getTime() : 0);
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const emptySnapshot = (): TutorDashboardSnapshot => ({
  generatedAtMs: Date.now(),
  sessions: [],
  groupClasses: [],
  totalStudents: 0,
  earnings: { monthNet: 0, monthPrivateNet: 0, monthGroupNet: 0, available: 0, pendingClearance: 0, frozen: 0 },
  performance: { rating: null, reviewCount: 0, studentsTaught: 0, lessonsTaught: 0, repeatStudentsPct: 0, cancellationRatePct: 0 },
  messages: [],
  unreadMessages: 0,
  notifications: [],
  unreadNotifications: 0,
});

function sessionStatus(raw: unknown): TutorSessionStatus {
  if (raw === "Completed") return "completed";
  if (raw === "Cancelled") return "cancelled";
  return "scheduled";
}

// Same free-form duration keys student-learning-server.ts reads.
function cohortDurationMinutes(schedule: unknown): number {
  const s = (schedule && typeof schedule === "object" ? schedule : {}) as Row;
  const value = num(s.durationMinutes ?? s.duration_minutes ?? s.duration);
  return value > 0 ? value : 60;
}

function cohortScheduleLine(schedule: unknown): string {
  const s = (schedule && typeof schedule === "object" ? schedule : {}) as Row;
  const days = Array.isArray(s.days) ? (s.days as unknown[]).filter((d): d is string => typeof d === "string") : [];
  const time = strOrNull(s.time) ?? strOrNull(s.startTime) ?? strOrNull(s.start_time);
  return [days.join(", "), time].filter(Boolean).join(" · ");
}

export async function loadTutorDashboard(tutorId: string): Promise<TutorDashboardSnapshot> {
  try {
    return await load(tutorId);
  } catch (error) {
    console.error("loadTutorDashboard failed", error);
    return emptySnapshot();
  }
}

async function load(tutorId: string): Promise<TutorDashboardSnapshot> {
  const admin = getServiceRoleClient();
  const nowMs = Date.now();
  const today = getPlatformTodayParts(nowMs);
  const monthStartMs = platformWallTimeToMs(today.year, today.month, 1, 0, 0);

  const [
    { data: privateRows },
    { data: discoveryRows },
    { data: classRows },
    { data: confirmationRows },
    { data: payoutRows },
    { data: reviewRows },
    { data: notificationRows },
    { count: unreadNotifications },
    inbox,
  ] = await Promise.all([
    admin.from("private_lessons").select("id, student_id, subject, scheduled_at, duration_minutes, mode, status, payment_status").eq("tutor_id", tutorId).order("scheduled_at"),
    admin.from("discovery_sessions").select("id, student_id, subject, scheduled_start_at, scheduled_end_at, status").eq("tutor_id", tutorId).order("scheduled_start_at"),
    admin.from("group_classes").select("id, slug, title, subject, mode, status").eq("tutor_id", tutorId).neq("status", "Cancelled"),
    admin.from("lesson_confirmations").select("student_id, type, amount_gross, completed_at, auto_release_at, confirmation_status, escrow_status").eq("tutor_id", tutorId),
    admin.from("payout_requests").select("amount, status").eq("tutor_id", tutorId).neq("status", "rejected"),
    admin.from("reviews").select("rating").eq("recipient_id", tutorId).eq("direction", "student_to_tutor").eq("status", "published"),
    admin.from("notifications").select("id, text, category, action_url, unread, created_at").eq("user_id", tutorId).eq("dismissed", false).order("created_at", { ascending: false }).limit(8),
    admin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", tutorId).eq("dismissed", false).eq("unread", true),
    loadInbox(tutorId).catch(() => []),
  ]);

  const privates = (privateRows ?? []) as Row[];
  const discoveries = (discoveryRows ?? []) as Row[];
  const classes = (classRows ?? []) as Row[];
  const confirmations = (confirmationRows ?? []) as Row[];

  // Group classes: class -> cohorts -> sessions + active roster.
  const classIds = classes.map((c) => c.id as string);
  const { data: cohortRows } = classIds.length
    ? await admin.from("group_class_cohorts").select("id, group_class_id, start_date, schedule, seats_total, seats_filled, price, status").in("group_class_id", classIds).order("start_date")
    : { data: [] };
  const cohorts = (cohortRows ?? []) as Row[];
  const cohortIds = cohorts.map((c) => c.id as string);
  const [{ data: groupSessionRows }, { data: enrollmentRows }] = cohortIds.length
    ? await Promise.all([
        admin.from("group_class_sessions").select("id, cohort_id, scheduled_at, status").in("cohort_id", cohortIds).order("scheduled_at"),
        admin.from("group_class_enrollments").select("cohort_id, student_id").in("cohort_id", cohortIds).eq("status", "Active"),
      ])
    : [{ data: [] }, { data: [] }];
  const groupSessions = (groupSessionRows ?? []) as Row[];
  const enrollments = (enrollmentRows ?? []) as Row[];

  const studentIds = new Set<string>();
  privates.forEach((p) => p.status !== "Cancelled" && studentIds.add(p.student_id as string));
  discoveries.forEach((d) => d.student_id && d.status !== "Cancelled" && studentIds.add(d.student_id as string));
  enrollments.forEach((e) => studentIds.add(e.student_id as string));
  const { data: peopleRows } = studentIds.size ? await admin.from("profiles").select("id, full_name, avatar_url").in("id", [...studentIds]) : { data: [] };
  const people = new Map(((peopleRows ?? []) as Person[]).map((p) => [p.id, p]));
  const nameOf = (id: unknown) => (typeof id === "string" && people.get(id)?.full_name?.trim()) || "Student";
  const imageOf = (id: unknown) => (typeof id === "string" ? people.get(id)?.avatar_url ?? null : null);

  const sessions: TutorSession[] = [];
  for (const p of privates) {
    const startMs = ms(p.scheduled_at);
    const duration = num(p.duration_minutes) || 60;
    sessions.push({
      id: p.id as string,
      kind: "private",
      title: p.subject as string,
      withLabel: nameOf(p.student_id),
      studentImage: imageOf(p.student_id),
      startMs,
      endMs: startMs + duration * 60_000,
      durationMinutes: duration,
      mode: (p.mode as string) ?? "Online",
      status: sessionStatus(p.status),
      paid: p.payment_status === "paid",
      classroomHref: `/tutor-dashboard/classroom/private/${p.id}`,
    });
  }
  for (const d of discoveries) {
    const startMs = ms(d.scheduled_start_at);
    const endMs = ms(d.scheduled_end_at) || startMs + 25 * 60_000;
    sessions.push({
      id: d.id as string,
      kind: "discovery",
      title: d.subject ? `Discovery · ${d.subject}` : "Discovery Session",
      withLabel: nameOf(d.student_id),
      studentImage: imageOf(d.student_id),
      startMs,
      endMs,
      durationMinutes: Math.round((endMs - startMs) / 60_000),
      mode: "Online",
      status: sessionStatus(d.status),
      paid: true,
      classroomHref: `/tutor-dashboard/classroom/discovery/${d.id}`,
    });
  }
  for (const s of groupSessions) {
    const cohort = cohorts.find((c) => c.id === s.cohort_id);
    const cls = cohort && classes.find((c) => c.id === cohort.group_class_id);
    if (!cohort || !cls) continue;
    const startMs = ms(s.scheduled_at);
    const duration = cohortDurationMinutes(cohort.schedule);
    const enrolled = enrollments.filter((e) => e.cohort_id === cohort.id).length;
    sessions.push({
      id: s.id as string,
      kind: "group",
      title: cls.title as string,
      withLabel: `${enrolled} enrolled`,
      studentImage: null,
      startMs,
      endMs: startMs + duration * 60_000,
      durationMinutes: duration,
      mode: (cls.mode as string) ?? "Online",
      status: cohort.status === "Cancelled" ? "cancelled" : sessionStatus(s.status),
      paid: true,
      classroomHref: `/tutor-dashboard/classroom/group/${cls.id}`,
    });
  }
  sessions.sort((a, b) => a.startMs - b.startMs);

  // One card per published class, showing its current (or next) cohort.
  const groupClasses: TutorGroupClassCard[] = classes
    .filter((c) => c.status === "Published")
    .flatMap((c) => {
      const cohort = cohorts.find((k) => k.group_class_id === c.id && (k.status === "InProgress" || k.status === "Scheduled"));
      if (!cohort) return [];
      const next = groupSessions.find((s) => s.cohort_id === cohort.id && s.status === "Scheduled" && ms(s.scheduled_at) > nowMs);
      return [
        {
          id: c.id as string,
          slug: c.slug as string,
          title: c.title as string,
          subject: c.subject as string,
          scheduleLine: cohortScheduleLine(cohort.schedule),
          seatsFilled: num(cohort.seats_filled),
          seatsTotal: num(cohort.seats_total),
          price: num(cohort.price),
          nextSessionMs: next ? ms(next.scheduled_at) : null,
        },
      ];
    })
    .sort((a, b) => (a.nextSessionMs ?? Infinity) - (b.nextSessionMs ?? Infinity));

  // Earnings. A Held record clears once its auto-release time passes
  // without a dispute (nothing flips the row itself, so read it by time).
  const earnings: TutorEarningsSummary = { monthNet: 0, monthPrivateNet: 0, monthGroupNet: 0, available: 0, pendingClearance: 0, frozen: 0 };
  let clearedNet = 0;
  for (const c of confirmations) {
    const net = splitEarnings(num(c.amount_gross)).net;
    const frozen = c.escrow_status === "Frozen" || c.confirmation_status === "Disputed";
    if (frozen) {
      earnings.frozen += net;
      continue;
    }
    const cleared = c.escrow_status === "Released" || ms(c.auto_release_at) <= nowMs;
    if (cleared) clearedNet += net;
    else earnings.pendingClearance += net;
    if (ms(c.completed_at) >= monthStartMs) {
      earnings.monthNet += net;
      if (c.type === "Group") earnings.monthGroupNet += net;
      else earnings.monthPrivateNet += net;
    }
  }
  const requested = ((payoutRows ?? []) as Row[]).reduce((sum, p) => sum + num(p.amount), 0);
  earnings.available = Math.max(0, clearedNet - requested);

  // Performance.
  const ratings = ((reviewRows ?? []) as Row[]).map((r) => num(r.rating));
  const completedPrivates = privates.filter((p) => p.status === "Completed");
  const lessonsPerStudent = new Map<string, number>();
  completedPrivates.forEach((p) => lessonsPerStudent.set(p.student_id as string, (lessonsPerStudent.get(p.student_id as string) ?? 0) + 1));
  const taught = new Set<string>([...lessonsPerStudent.keys()]);
  confirmations.forEach((c) => taught.add(c.student_id as string));
  discoveries.forEach((d) => d.status === "Completed" && d.student_id && taught.add(d.student_id as string));
  const completedGroupSessions = groupSessions.filter((s) => s.status === "Completed").length;
  const completedDiscoveries = discoveries.filter((d) => d.status === "Completed").length;
  // Only bookings whose time has come count toward the cancellation rate —
  // a future lesson hasn't had the chance to be kept yet.
  const decidedPrivates = privates.filter((p) => p.status === "Completed" || p.status === "Cancelled");
  const performance: TutorPerformance = {
    rating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    reviewCount: ratings.length,
    studentsTaught: taught.size,
    lessonsTaught: completedPrivates.length + completedGroupSessions + completedDiscoveries,
    repeatStudentsPct: pct([...lessonsPerStudent.values()].filter((n) => n > 1).length, lessonsPerStudent.size),
    cancellationRatePct: pct(decidedPrivates.filter((p) => p.status === "Cancelled").length, decidedPrivates.length),
  };

  const messages: TutorMessagePreview[] = inbox
    .filter((c) => !c.archived && c.lastMessage)
    .slice(0, 3)
    .map((c) => ({
      id: c.id,
      name: c.others.map((o) => o.name).join(", ") || "Conversation",
      image: c.others[0]?.image ?? null,
      preview: c.lastMessage!.body || (c.lastMessage!.hasAttachments ? "Sent an attachment" : ""),
      atMs: c.lastMessage!.createdAtMs,
      unread: c.unread > 0,
    }));

  return {
    generatedAtMs: nowMs,
    sessions,
    groupClasses,
    totalStudents: studentIds.size,
    earnings,
    performance,
    messages,
    unreadMessages: inbox.reduce((sum, c) => sum + (c.archived ? 0 : c.unread), 0),
    notifications: ((notificationRows ?? []) as Row[]).map((n) => ({
      id: n.id as string,
      text: n.text as string,
      category: (n.category as string) ?? "",
      actionUrl: strOrNull(n.action_url),
      unread: n.unread === true,
      createdAtMs: ms(n.created_at),
    })),
    unreadNotifications: unreadNotifications ?? 0,
  };
}
