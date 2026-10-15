// Server-side loaders for the admin Users / User Directory / Bookings pages
// (real Supabase data). Same rules as admin-registrations.ts: only import from
// Server Components under /admin; reads go through the signed-in admin's own
// session so Row Level Security still applies.
import { loadAccounts, type AccountRole, type AdminAccountRow } from "@/lib/admin-registrations";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeTutorStatus, type TutorApplicationStatus } from "@/lib/tutor-application";

// ── Account status ──────────────────────────────────────────────────────

export type AccountStatus = "active" | "warned" | "messaging_restricted" | "suspended";

export interface AdminRestriction {
  id: string;
  type: "Warning" | "MessagingRestriction" | "Suspension";
  reason: string;
  status: "active" | "expired" | "reversed" | "under_review";
  startAt: string;
  endAt: string | null;
  durationLabel: string | null;
  resolvedAt: string | null;
  resolutionReason: string | null;
}

type RestrictionRow = {
  id: string;
  actor_id: string;
  type: AdminRestriction["type"];
  reason: string;
  status: AdminRestriction["status"];
  start_at: string;
  end_at: string | null;
  duration_label: string | null;
  resolved_at: string | null;
  resolution_reason: string | null;
};

const RESTRICTION_COLUMNS = "id, actor_id, type, reason, status, start_at, end_at, duration_label, resolved_at, resolution_reason";

function toRestriction(r: RestrictionRow): AdminRestriction {
  return { id: r.id, type: r.type, reason: r.reason, status: r.status, startAt: r.start_at, endAt: r.end_at, durationLabel: r.duration_label, resolvedAt: r.resolved_at, resolutionReason: r.resolution_reason };
}

// A restriction counts while it's "active" (or being appealed) and hasn't
// run past its end date.
export function isRestrictionInForce(r: AdminRestriction, nowMs = Date.now()): boolean {
  if (r.status !== "active" && r.status !== "under_review") return false;
  if (new Date(r.startAt).getTime() > nowMs) return false;
  return !r.endAt || new Date(r.endAt).getTime() > nowMs;
}

const severity: Record<AdminRestriction["type"], number> = { Warning: 1, MessagingRestriction: 2, Suspension: 3 };

export function statusFromRestrictions(list: AdminRestriction[]): { status: AccountStatus; current: AdminRestriction | null } {
  const inForce = list.filter((r) => isRestrictionInForce(r)).sort((a, b) => severity[b.type] - severity[a.type]);
  const top = inForce[0];
  if (!top) return { status: "active", current: null };
  const status: AccountStatus = top.type === "Suspension" ? "suspended" : top.type === "MessagingRestriction" ? "messaging_restricted" : "warned";
  return { status, current: top };
}

// ── User directory ──────────────────────────────────────────────────────

export interface DirectoryRow extends AdminAccountRow {
  status: AccountStatus;
  currentRestriction: AdminRestriction | null;
  tutorStatus: TutorApplicationStatus | null;
  bookingCount: number;
  lastSeenAt: string | null;
}

export async function loadDirectory(): Promise<DirectoryRow[]> {
  const supabase = await getSupabaseServerClient();
  const [accounts, { data: restrictions }, { data: tutors }, { data: lessons }, { data: seen }] = await Promise.all([
    loadAccounts(),
    supabase.from("account_restrictions").select(RESTRICTION_COLUMNS).in("status", ["active", "under_review"]),
    supabase.from("tutor_profiles").select("id, application_status"),
    supabase.from("private_lessons").select("student_id, tutor_id"),
    supabase.from("profiles").select("id, last_seen_at"),
  ]);

  const byActor = new Map<string, AdminRestriction[]>();
  for (const r of (restrictions ?? []) as RestrictionRow[]) {
    byActor.set(r.actor_id, [...(byActor.get(r.actor_id) ?? []), toRestriction(r)]);
  }
  const tutorStatus = new Map(((tutors ?? []) as { id: string; application_status: string }[]).map((t) => [t.id, normalizeTutorStatus(t.application_status)]));
  const counts = new Map<string, number>();
  for (const l of (lessons ?? []) as { student_id: string; tutor_id: string }[]) {
    counts.set(l.student_id, (counts.get(l.student_id) ?? 0) + 1);
    counts.set(l.tutor_id, (counts.get(l.tutor_id) ?? 0) + 1);
  }
  const lastSeen = new Map(((seen ?? []) as { id: string; last_seen_at: string | null }[]).map((p) => [p.id, p.last_seen_at]));

  return accounts.map((a) => {
    const { status, current } = statusFromRestrictions(byActor.get(a.id) ?? []);
    return {
      ...a,
      status,
      currentRestriction: current,
      tutorStatus: a.role === "tutor" ? (tutorStatus.get(a.id) ?? "pending") : null,
      bookingCount: counts.get(a.id) ?? 0,
      lastSeenAt: lastSeen.get(a.id) ?? null,
    };
  });
}

// ── Bookings ────────────────────────────────────────────────────────────

export type BookingKind = "private" | "group" | "discovery";
export type AdminBookingStatus = "Pending" | "Upcoming" | "Live" | "Completed" | "Cancelled" | "Disputed" | "Waitlisted" | "No-show";
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "partially_refunded";

export interface BookingPerson {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface AdminBookingRow {
  id: string;
  kind: BookingKind;
  reference: string;
  title: string;
  subject: string;
  student: BookingPerson | null;
  tutor: BookingPerson | null;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  amount: number;
  paymentStatus: PaymentStatus;
  status: AdminBookingStatus;
  mode: string | null;
  createdAt: string;
  sessionLabel: string | null;
}

type PrivateLessonRow = {
  id: string;
  booking_reference: string;
  student_id: string;
  tutor_id: string;
  subject: string;
  academic_level: string | null;
  scheduled_at: string;
  duration_minutes: number;
  mode: string;
  status: "Upcoming" | "Pending" | "Completed" | "Cancelled";
  price: number | string;
  frequency: string | null;
  booking_group_id: string | null;
  session_number: number | null;
  total_sessions: number | null;
  notes: string | null;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
};

type EnrollmentRow = {
  id: string;
  booking_reference: string;
  cohort_id: string;
  student_id: string;
  plan: string | null;
  status: "Active" | "Waitlisted" | "Cancelled" | "Completed";
  waitlist_position: number | null;
  enrolled_at: string;
  cancelled_at: string | null;
};

type CohortRow = { id: string; group_class_id: string; cohort_index: number; start_date: string; end_date: string; price: number | string; status: string };
type GroupClassRow = { id: string; tutor_id: string; title: string; subject: string; mode: string | null };

type DiscoveryRow = {
  id: string;
  booking_reference: string;
  student_id: string;
  tutor_id: string | null;
  subject: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  price: number | string;
  status: "Scheduled" | "Completed" | "Cancelled" | "NoShow";
  payment_status: "unpaid" | "paid" | "refunded";
  created_at: string;
};

type DisputeRow = { student_id: string; tutor_id: string; subject: string; completed_at: string | null };

const LESSON_COLUMNS =
  "id, booking_reference, student_id, tutor_id, subject, academic_level, scheduled_at, duration_minutes, mode, status, price, frequency, booking_group_id, session_number, total_sessions, notes, payment_status, created_at, updated_at, cancelled_at, cancellation_reason";

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

// Upcoming/Live/Completed are re-derived from the clock so a lesson that has
// started shows as Live and one that has ended stops showing as Upcoming.
function timedStatus(stored: AdminBookingStatus, startAt: string, endAt: string, nowMs: number): AdminBookingStatus {
  if (stored !== "Upcoming") return stored;
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (nowMs >= end) return "Completed";
  if (nowMs >= start) return "Live";
  return "Upcoming";
}

async function loadPeople(ids: string[]): Promise<Map<string, BookingPerson>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", unique);
  return new Map(
    ((data ?? []) as { id: string; full_name: string | null; email: string; avatar_url: string | null }[]).map((p) => [p.id, { id: p.id, name: p.full_name?.trim() || p.email, email: p.email, avatarUrl: p.avatar_url }])
  );
}

function isDisputed(l: PrivateLessonRow, disputes: DisputeRow[]): boolean {
  const start = new Date(l.scheduled_at).getTime();
  return disputes.some(
    (d) => d.student_id === l.student_id && d.tutor_id === l.tutor_id && d.subject === l.subject && (!d.completed_at || Math.abs(new Date(d.completed_at).getTime() - start) < 2 * 86_400_000)
  );
}

function privateRow(l: PrivateLessonRow, people: Map<string, BookingPerson>, disputes: DisputeRow[], nowMs: number): AdminBookingRow {
  const endAt = addMinutes(l.scheduled_at, l.duration_minutes);
  const stored: AdminBookingStatus = isDisputed(l, disputes) && l.status !== "Cancelled" ? "Disputed" : l.status;
  return {
    id: l.id,
    kind: "private",
    reference: l.booking_reference,
    title: `${l.subject} · Private lesson`,
    subject: l.subject,
    student: people.get(l.student_id) ?? null,
    tutor: people.get(l.tutor_id) ?? null,
    startAt: l.scheduled_at,
    endAt,
    durationMinutes: l.duration_minutes,
    amount: Number(l.price),
    paymentStatus: l.payment_status,
    status: timedStatus(stored, l.scheduled_at, endAt, nowMs),
    mode: l.mode,
    createdAt: l.created_at,
    sessionLabel: l.total_sessions && l.total_sessions > 1 ? `Session ${l.session_number ?? 1} of ${l.total_sessions}` : null,
  };
}

function groupRow(e: EnrollmentRow, cohort: CohortRow | undefined, klass: GroupClassRow | undefined, people: Map<string, BookingPerson>, nowMs: number): AdminBookingRow {
  const startAt = cohort ? `${cohort.start_date}T00:00:00+01:00` : e.enrolled_at;
  const endAt = cohort ? `${cohort.end_date}T23:59:59+01:00` : e.enrolled_at;
  const stored: AdminBookingStatus = e.status === "Active" ? "Upcoming" : e.status === "Waitlisted" ? "Waitlisted" : e.status;
  return {
    id: e.id,
    kind: "group",
    reference: e.booking_reference,
    title: klass?.title ?? "Group class",
    subject: klass?.subject ?? "Group class",
    student: people.get(e.student_id) ?? null,
    tutor: klass ? (people.get(klass.tutor_id) ?? null) : null,
    startAt,
    endAt,
    durationMinutes: Math.max(0, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000)),
    amount: cohort ? Number(cohort.price) : 0,
    paymentStatus: "paid",
    status: timedStatus(stored, startAt, endAt, nowMs),
    mode: klass?.mode ?? null,
    createdAt: e.enrolled_at,
    sessionLabel: cohort ? `Cohort ${cohort.cohort_index}` : null,
  };
}

function discoveryRow(d: DiscoveryRow, people: Map<string, BookingPerson>, nowMs: number): AdminBookingRow {
  const stored: AdminBookingStatus = d.status === "Scheduled" ? "Upcoming" : d.status === "NoShow" ? "No-show" : d.status;
  return {
    id: d.id,
    kind: "discovery",
    reference: d.booking_reference,
    title: `${d.subject} · Discovery session`,
    subject: d.subject,
    student: people.get(d.student_id) ?? null,
    tutor: d.tutor_id ? (people.get(d.tutor_id) ?? null) : null,
    startAt: d.scheduled_start_at,
    endAt: d.scheduled_end_at,
    durationMinutes: Math.round((new Date(d.scheduled_end_at).getTime() - new Date(d.scheduled_start_at).getTime()) / 60_000),
    amount: Number(d.price),
    paymentStatus: d.payment_status,
    status: timedStatus(stored, d.scheduled_start_at, d.scheduled_end_at, nowMs),
    mode: "Online",
    createdAt: d.created_at,
    sessionLabel: null,
  };
}

async function loadGroupContext(enrollments: EnrollmentRow[]) {
  const supabase = await getSupabaseServerClient();
  const cohortIds = Array.from(new Set(enrollments.map((e) => e.cohort_id)));
  const { data: cohorts } = cohortIds.length
    ? await supabase.from("group_class_cohorts").select("id, group_class_id, cohort_index, start_date, end_date, price, status").in("id", cohortIds)
    : { data: [] };
  const classIds = Array.from(new Set(((cohorts ?? []) as CohortRow[]).map((c) => c.group_class_id)));
  const { data: classes } = classIds.length ? await supabase.from("group_classes").select("id, tutor_id, title, subject, mode").in("id", classIds) : { data: [] };
  const cohortMap = new Map(((cohorts ?? []) as CohortRow[]).map((c) => [c.id, c]));
  const classMap = new Map(((classes ?? []) as GroupClassRow[]).map((c) => [c.id, c]));
  return { cohortMap, classMap };
}

export async function loadBookings(filter: { userId?: string } = {}): Promise<AdminBookingRow[]> {
  const supabase = await getSupabaseServerClient();
  let lessonQuery = supabase.from("private_lessons").select(LESSON_COLUMNS).order("scheduled_at", { ascending: false });
  let enrollmentQuery = supabase.from("group_class_enrollments").select("id, booking_reference, cohort_id, student_id, plan, status, waitlist_position, enrolled_at, cancelled_at");
  let discoveryQuery = supabase.from("discovery_sessions").select("id, booking_reference, student_id, tutor_id, subject, scheduled_start_at, scheduled_end_at, price, status, payment_status, created_at");
  if (filter.userId) {
    const or = `student_id.eq.${filter.userId},tutor_id.eq.${filter.userId}`;
    lessonQuery = lessonQuery.or(or);
    enrollmentQuery = enrollmentQuery.eq("student_id", filter.userId);
    discoveryQuery = discoveryQuery.or(or);
  }

  const [{ data: lessons }, { data: enrollments }, { data: discovery }, { data: disputes }] = await Promise.all([
    lessonQuery,
    enrollmentQuery,
    discoveryQuery,
    supabase.from("lesson_confirmations").select("student_id, tutor_id, subject, completed_at").eq("confirmation_status", "Disputed").eq("type", "Private"),
  ]);
  const lessonRows = (lessons ?? []) as PrivateLessonRow[];
  const enrollmentRows = (enrollments ?? []) as EnrollmentRow[];
  const discoveryRows = (discovery ?? []) as DiscoveryRow[];
  const { cohortMap, classMap } = await loadGroupContext(enrollmentRows);

  const people = await loadPeople([
    ...lessonRows.flatMap((l) => [l.student_id, l.tutor_id]),
    ...enrollmentRows.map((e) => e.student_id),
    ...Array.from(classMap.values()).map((c) => c.tutor_id),
    ...discoveryRows.flatMap((d) => [d.student_id, d.tutor_id ?? ""]),
  ]);
  const nowMs = Date.now();

  return [
    ...lessonRows.map((l) => privateRow(l, people, (disputes ?? []) as DisputeRow[], nowMs)),
    ...enrollmentRows.map((e) => {
      const cohort = cohortMap.get(e.cohort_id);
      return groupRow(e, cohort, cohort ? classMap.get(cohort.group_class_id) : undefined, people, nowMs);
    }),
    ...discoveryRows.map((d) => discoveryRow(d, people, nowMs)),
  ].sort((a, b) => b.startAt.localeCompare(a.startAt));
}

// ── One booking ─────────────────────────────────────────────────────────

export interface BookingTimelineEntry {
  at: string;
  label: string;
  detail: string | null;
  actor: string | null;
}

export interface AdminBookingDetail extends AdminBookingRow {
  academicLevel: string | null;
  frequency: string | null;
  notes: string | null;
  cancellationReason: string | null;
  cancellation: { fee: number; refundAmount: number; reason: string | null; at: string } | null;
  refunds: { amount: number; status: string; reason: string | null; at: string }[];
  timeline: BookingTimelineEntry[];
  adminNotes: { at: string; note: string; actor: string | null }[];
  canCancel: boolean;
  canReschedule: boolean;
}

const eventLabels: Record<string, string> = {
  created: "Booking created",
  booked: "Booking created",
  paid: "Payment received",
  payment_received: "Payment received",
  cancelled: "Booking cancelled",
  rescheduled: "Lesson rescheduled",
  completed: "Lesson completed",
  admin_note: "Admin note",
};

export async function loadBooking(id: string): Promise<AdminBookingDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabaseServerClient();
  const [{ data: lesson }, { data: enrollment }, { data: discovery }] = await Promise.all([
    supabase.from("private_lessons").select(LESSON_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("group_class_enrollments").select("id, booking_reference, cohort_id, student_id, plan, status, waitlist_position, enrolled_at, cancelled_at").eq("id", id).maybeSingle(),
    supabase.from("discovery_sessions").select("id, booking_reference, student_id, tutor_id, subject, scheduled_start_at, scheduled_end_at, price, status, payment_status, created_at").eq("id", id).maybeSingle(),
  ]);
  const nowMs = Date.now();

  const eventColumn = lesson ? "private_lesson_id" : "group_class_enrollment_id";
  const [{ data: events }, { data: cancellations }, { data: reschedules }, { data: refunds }] = await Promise.all([
    lesson || enrollment ? supabase.from("booking_events").select("event_type, actor_id, note, metadata, created_at").eq(eventColumn, id).order("created_at") : Promise.resolve({ data: [] }),
    lesson || enrollment ? supabase.from("cancellations").select("cancelled_by, reason, fee, refund_amount, created_at").eq(eventColumn, id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    lesson ? supabase.from("reschedules").select("requested_by, old_scheduled_at, new_scheduled_at, status, created_at").eq("private_lesson_id", id).order("created_at") : Promise.resolve({ data: [] }),
    supabase.from("refunds").select("amount, status, reason, initiated_at").eq("booking_id", id).order("initiated_at", { ascending: false }),
  ]);

  type EventRow = { event_type: string; actor_id: string | null; note: string | null; metadata: Record<string, unknown> | null; created_at: string };
  type CancelRow = { cancelled_by: string | null; reason: string | null; fee: number | string; refund_amount: number | string; created_at: string };
  type RescheduleRow = { requested_by: string | null; old_scheduled_at: string; new_scheduled_at: string; status: string; created_at: string };
  const eventRows = (events ?? []) as EventRow[];
  const rescheduleRows = (reschedules ?? []) as RescheduleRow[];
  const cancelRows = (cancellations ?? []) as CancelRow[];

  let base: AdminBookingRow;
  let extra: Pick<AdminBookingDetail, "academicLevel" | "frequency" | "notes" | "cancellationReason">;
  if (lesson) {
    const l = lesson as PrivateLessonRow;
    const [people, { data: disputes }] = await Promise.all([
      loadPeople([l.student_id, l.tutor_id, ...eventRows.map((e) => e.actor_id ?? ""), ...rescheduleRows.map((r) => r.requested_by ?? "")]),
      supabase.from("lesson_confirmations").select("student_id, tutor_id, subject, completed_at").eq("confirmation_status", "Disputed").eq("student_id", l.student_id).eq("tutor_id", l.tutor_id),
    ]);
    base = privateRow(l, people, (disputes ?? []) as DisputeRow[], nowMs);
    extra = { academicLevel: l.academic_level, frequency: l.frequency, notes: l.notes, cancellationReason: l.cancellation_reason };
    return finish(base, extra, people);
  }
  if (enrollment) {
    const e = enrollment as EnrollmentRow;
    const { cohortMap, classMap } = await loadGroupContext([e]);
    const cohort = cohortMap.get(e.cohort_id);
    const klass = cohort ? classMap.get(cohort.group_class_id) : undefined;
    const people = await loadPeople([e.student_id, klass?.tutor_id ?? "", ...eventRows.map((ev) => ev.actor_id ?? "")]);
    base = groupRow(e, cohort, klass, people, nowMs);
    extra = { academicLevel: null, frequency: e.plan, notes: null, cancellationReason: null };
    return finish(base, extra, people);
  }
  if (discovery) {
    const d = discovery as DiscoveryRow;
    const people = await loadPeople([d.student_id, d.tutor_id ?? ""]);
    base = discoveryRow(d, people, nowMs);
    extra = { academicLevel: null, frequency: null, notes: null, cancellationReason: null };
    return finish(base, extra, people);
  }
  return null;

  function finish(row: AdminBookingRow, more: typeof extra, people: Map<string, BookingPerson>): AdminBookingDetail {
    const name = (uid: string | null) => (uid ? (people.get(uid)?.name ?? "Ensena admin") : null);
    const timeline: BookingTimelineEntry[] = [
      { at: row.createdAt, label: "Booking created", detail: row.reference, actor: row.student?.name ?? null },
      ...eventRows
        .filter((e) => e.event_type !== "admin_note" && e.event_type !== "created" && e.event_type !== "booked" && e.event_type !== "rescheduled")
        .map((e) => ({ at: e.created_at, label: eventLabels[e.event_type] ?? e.event_type.replace(/_/g, " "), detail: e.note, actor: name(e.actor_id) })),
      ...rescheduleRows.map((r) => ({
        at: r.created_at,
        label: "Lesson rescheduled",
        detail: `${formatLagos(r.old_scheduled_at)} → ${formatLagos(r.new_scheduled_at)}`,
        actor: name(r.requested_by),
      })),
    ].sort((a, b) => a.at.localeCompare(b.at));
    const c = cancelRows[0];
    const open = row.status === "Upcoming" || row.status === "Pending" || row.status === "Waitlisted";
    return {
      ...row,
      ...more,
      cancellation: c ? { fee: Number(c.fee), refundAmount: Number(c.refund_amount), reason: c.reason, at: c.created_at } : null,
      refunds: ((refunds ?? []) as { amount: number | string; status: string; reason: string | null; initiated_at: string }[]).map((r) => ({ amount: Number(r.amount), status: r.status, reason: r.reason, at: r.initiated_at })),
      timeline,
      adminNotes: eventRows.filter((e) => e.event_type === "admin_note").map((e) => ({ at: e.created_at, note: e.note ?? "", actor: name(e.actor_id) })).reverse(),
      canCancel: open,
      canReschedule: open && row.kind === "private",
    };
  }
}

export function formatLagos(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

// ── One user ────────────────────────────────────────────────────────────

export interface AdminUserDetail extends DirectoryRow {
  restrictions: AdminRestriction[];
  bookings: AdminBookingRow[];
  guardianChildren: { id: string; name: string; consentStatus: "pending" | "confirmed" }[];
}

export async function loadAdminUser(id: string): Promise<AdminUserDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabaseServerClient();
  const [directory, { data: restrictions }, bookings, { data: links }] = await Promise.all([
    loadDirectory(),
    supabase.from("account_restrictions").select(RESTRICTION_COLUMNS).eq("actor_id", id).order("start_at", { ascending: false }),
    loadBookings({ userId: id }),
    supabase.from("student_guardians").select("student_id, consent_status").eq("guardian_user_id", id),
  ]);
  const row = directory.find((d) => d.id === id);
  if (!row) return null;
  const linkRows = (links ?? []) as { student_id: string; consent_status: string }[];
  const kids = await loadPeople(linkRows.map((l) => l.student_id));
  return {
    ...row,
    restrictions: ((restrictions ?? []) as RestrictionRow[]).map(toRestriction),
    bookings,
    guardianChildren: linkRows.map((l) => ({ id: l.student_id, name: kids.get(l.student_id)?.name ?? "Student", consentStatus: l.consent_status === "confirmed" ? "confirmed" : "pending" })),
  };
}

export type { AccountRole };
