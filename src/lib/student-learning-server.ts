// Server-only: everything the live student dashboard and My Classes pages
// show, read from Supabase for ONE signed-in student. Tutor/counsellor names
// and photos live on other people's profiles, which RLS doesn't let a
// student read directly — so this uses the service-role client, always
// filtered to `studentId`'s own rows (same approach as
// student-profile-server.ts).
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { parseTutorApplication } from "@/lib/tutor-application";

export type LearningKind = "private" | "group" | "discovery" | "counselling";
export type LearningStatus = "scheduled" | "completed" | "cancelled" | "no-show";

export interface LearningSession {
  id: string;
  kind: LearningKind;
  title: string;
  subject: string;
  personId: string | null;
  personName: string;
  personImage: string | null;
  startMs: number;
  endMs: number;
  durationMinutes: number;
  mode: string;
  status: LearningStatus;
  paymentStatus: string | null;
  price: number;
  bookingReference: string | null;
  notes: string | null;
  /** Private lessons booked as a weekly/monthly series share this. */
  seriesId: string | null;
  frequency: string | null;
  sessionNumber: number | null;
  totalSessions: number | null;
  /** Group classes only. */
  groupClassId: string | null;
  seatsFilled: number | null;
  seatsTotal: number | null;
  cancelledAtMs: number | null;
  cancellationReason: string | null;
  refundAmount: number | null;
  /** Set when a lesson_confirmations row already records this session as completed. */
  confirmationId: string | null;
  classroomHref: string | null;
}

export interface CompletedLesson {
  id: string;
  bookingType: "private" | "group";
  subject: string;
  tutorId: string;
  tutorName: string;
  tutorImage: string | null;
  completedAtMs: number;
  amount: number | null;
  /** null when the lesson is marked Completed but has no escrow record. */
  confirmationStatus: "Pending" | "Confirmed" | "Disputed" | null;
  escrowStatus: "Held" | "Released" | "Frozen" | null;
  autoReleaseAtMs: number | null;
  /** Whether the student can leave a review now (lesson confirmed / cleared, not disputed). */
  reviewable: boolean;
  review: { rating: number; comment: string } | null;
  /** Group sessions only: whether the student attended (group_attendance), null when not recorded. */
  attended: boolean | null;
}

export interface StudyTaskRow {
  id: string;
  label: string;
  subject: string | null;
  /** YYYY-MM-DD (platform calendar date), or null for "someday". */
  dueDate: string | null;
  done: boolean;
}

export interface RecommendedTutor {
  id: string;
  name: string;
  image: string | null;
  headline: string;
  bio: string;
  matchedSubjects: string[];
  subjects: string[];
  levels: string[];
  pricePerHour: number | null;
  rating: number | null;
  reviewCount: number;
  country: string;
  teachingDays: string[];
}

export interface GroupClassSuggestion {
  id: string;
  slug: string;
  title: string;
  subject: string;
  level: string;
  tutorName: string;
  tutorImage: string | null;
  seatsFilled: number;
  seatsTotal: number;
  price: number;
  startDate: string;
}

export interface LiveNotification {
  id: string;
  text: string;
  category: string;
  actionUrl: string | null;
  unread: boolean;
  createdAtMs: number;
}

export interface StudentLearningSnapshot {
  generatedAtMs: number;
  sessions: LearningSession[];
  completed: CompletedLesson[];
  studyTasks: StudyTaskRow[];
  recommendedTutors: RecommendedTutor[];
  savedTutorIds: string[];
  groupClassSuggestions: GroupClassSuggestion[];
  notifications: LiveNotification[];
  unreadNotifications: number;
  /** Sum of unread messages across the student's conversations. */
  unreadMessages: number;
  /** Numeric homework grades (0–100) the student's tutors have recorded. */
  homeworkScores: number[];
  hasCounselling: boolean;
}

type Row = Record<string, unknown>;
type Person = { id: string; full_name: string | null; avatar_url: string | null };

const emptySnapshot = (): StudentLearningSnapshot => ({
  generatedAtMs: Date.now(),
  sessions: [],
  completed: [],
  studyTasks: [],
  recommendedTutors: [],
  savedTutorIds: [],
  groupClassSuggestions: [],
  notifications: [],
  unreadNotifications: 0,
  unreadMessages: 0,
  homeworkScores: [],
  hasCounselling: false,
});

const ms = (v: unknown): number => (typeof v === "string" ? new Date(v).getTime() : 0);
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Homework grades are free text ("85", "85%", "17/20"). Only numeric ones
// count towards an average score; letter grades are left out rather than guessed.
function parseGrade(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const fraction = raw.match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/);
  if (fraction) return Number(fraction[2]) > 0 ? Math.min(100, (Number(fraction[1]) / Number(fraction[2])) * 100) : null;
  const pct = raw.match(/^\s*(\d+(?:\.\d+)?)\s*%?\s*$/);
  return pct && Number(pct[1]) <= 100 ? Number(pct[1]) : null;
}

function sessionStatus(raw: unknown): LearningStatus {
  switch (raw) {
    case "Completed":
      return "completed";
    case "Cancelled":
      return "cancelled";
    case "NoShow":
      return "no-show";
    default:
      return "scheduled";
  }
}

// A group cohort's schedule jsonb is free-form tutor input — look for the
// handful of duration keys it's been written with, falling back to an hour.
function cohortDurationMinutes(schedule: unknown): number {
  const s = (schedule && typeof schedule === "object" ? schedule : {}) as Row;
  const value = num(s.durationMinutes ?? s.duration_minutes ?? s.duration);
  return value > 0 ? value : 60;
}

// Rough equivalence between a student's academic level and the coarse
// levels tutors pick at sign-up ("Primary", "Secondary", "Exams",
// "University", "Language", …).
function tutorLevelsForStudent(academicLevel: string): string[] {
  const level = norm(academicLevel);
  if (!level) return [];
  if (/primary|nursery|basic/.test(level)) return ["primary"];
  if (/jss|sss|ss\d|secondary|junior|senior/.test(level)) return ["secondary", "exams"];
  if (/waec|neco|jamb|utme|exam/.test(level)) return ["exams", "secondary"];
  if (/undergrad|level|university|masters|phd|postgrad/.test(level)) return ["university", "undergraduate", "postgraduate"];
  return [level];
}

function subjectMatches(studentSubjects: string[], tutorSubjects: string[]): string[] {
  const wanted = studentSubjects.map(norm).filter(Boolean);
  if (wanted.length === 0) return [];
  return tutorSubjects.filter((t) => {
    const n = norm(t);
    return wanted.some((w) => n === w || n.includes(w) || w.includes(n));
  });
}

export async function loadStudentLearning(studentId: string): Promise<StudentLearningSnapshot> {
  try {
    return await load(studentId);
  } catch (error) {
    console.error("loadStudentLearning failed", error);
    return emptySnapshot();
  }
}

async function load(studentId: string): Promise<StudentLearningSnapshot> {
  const admin = getServiceRoleClient();
  const nowMs = Date.now();

  const [
    { data: student },
    { data: privateRows },
    { data: discoveryRows },
    { data: counsellingRows },
    { data: enrollmentRows },
    { data: confirmationRows },
    { data: reviewRows },
    { data: taskRows },
    { data: savedRows },
    { data: notificationRows },
    { count: unreadCount },
    { data: conversationRows },
    { data: homeworkRows },
  ] = await Promise.all([
    admin.from("student_profiles").select("academic_level, academic_detail, subjects, course").eq("id", studentId).maybeSingle(),
    admin.from("private_lessons").select("*").eq("student_id", studentId).order("scheduled_at"),
    admin.from("discovery_sessions").select("*").eq("student_id", studentId).order("scheduled_start_at"),
    admin.from("counselling_appointments").select("id, booking_reference, counsellor_id, scheduled_at, duration_minutes, status").eq("student_id", studentId).order("scheduled_at"),
    admin.from("group_class_enrollments").select("*").eq("student_id", studentId).neq("status", "Waitlisted"),
    admin.from("lesson_confirmations").select("*").eq("student_id", studentId).order("completed_at", { ascending: false }),
    admin.from("reviews").select("booking_id, rating, comment").eq("reviewer_id", studentId).eq("direction", "student_to_tutor"),
    admin.from("study_tasks").select("id, label, subject, due_date, done, created_at").eq("student_id", studentId).order("due_date", { nullsFirst: false }).order("created_at"),
    admin.from("saved_tutors").select("tutor_id").eq("student_id", studentId),
    admin.from("notifications").select("id, text, category, action_url, unread, created_at").eq("user_id", studentId).eq("dismissed", false).order("created_at", { ascending: false }).limit(5),
    admin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", studentId).eq("dismissed", false).eq("unread", true),
    admin.from("conversation_participants").select("unread_count").eq("user_id", studentId).eq("archived", false),
    admin.from("homework_items").select("grade").eq("student_id", studentId).not("grade", "is", null),
  ]);

  const privates = (privateRows ?? []) as Row[];
  const discoveries = (discoveryRows ?? []) as Row[];
  const counselling = (counsellingRows ?? []) as Row[];
  const enrollments = (enrollmentRows ?? []) as Row[];
  const confirmations = (confirmationRows ?? []) as Row[];
  const groupConfirmationIds = confirmations.filter((c) => c.type === "Group").map((c) => c.id as string);
  const { data: attendanceRows } = groupConfirmationIds.length
    ? await admin.from("group_attendance").select("lesson_confirmation_id, attended").eq("student_id", studentId).in("lesson_confirmation_id", groupConfirmationIds)
    : { data: [] };
  const attendance = new Map(((attendanceRows ?? []) as Row[]).map((a) => [a.lesson_confirmation_id as string, a.attended === true]));

  // Group classes: enrollment -> cohort -> class + that cohort's sessions.
  const cohortIds = [...new Set(enrollments.map((e) => e.cohort_id as string))];
  const [{ data: cohortRows }, { data: groupSessionRows }] = cohortIds.length
    ? await Promise.all([
        admin.from("group_class_cohorts").select("*").in("id", cohortIds),
        admin.from("group_class_sessions").select("*").in("cohort_id", cohortIds).order("scheduled_at"),
      ])
    : [{ data: [] }, { data: [] }];
  const cohorts = (cohortRows ?? []) as Row[];
  const classIds = [...new Set(cohorts.map((c) => c.group_class_id as string))];
  const { data: classRows } = classIds.length ? await admin.from("group_classes").select("*").in("id", classIds) : { data: [] };
  const classes = (classRows ?? []) as Row[];

  // Cancellation records for refund amounts.
  const privateIds = privates.map((p) => p.id as string);
  const enrollmentIds = enrollments.map((e) => e.id as string);
  const [{ data: privateCancellations }, { data: groupCancellations }] = await Promise.all([
    privateIds.length ? admin.from("cancellations").select("private_lesson_id, refund_amount, reason").in("private_lesson_id", privateIds) : { data: [] },
    enrollmentIds.length ? admin.from("cancellations").select("group_class_enrollment_id, refund_amount, reason").in("group_class_enrollment_id", enrollmentIds) : { data: [] },
  ]);
  const cancellations = [...((privateCancellations ?? []) as Row[]), ...((groupCancellations ?? []) as Row[])];

  // Every other person shown (tutors, counsellors).
  const personIds = new Set<string>();
  privates.forEach((p) => personIds.add(p.tutor_id as string));
  discoveries.forEach((d) => d.tutor_id && personIds.add(d.tutor_id as string));
  counselling.forEach((c) => c.counsellor_id && personIds.add(c.counsellor_id as string));
  classes.forEach((c) => personIds.add(c.tutor_id as string));
  confirmations.forEach((c) => personIds.add(c.tutor_id as string));
  const { data: peopleRows } = personIds.size ? await admin.from("profiles").select("id, full_name, avatar_url").in("id", [...personIds]) : { data: [] };
  const people = new Map(((peopleRows ?? []) as Person[]).map((p) => [p.id, p]));
  const personName = (id: unknown, fallback: string) => (typeof id === "string" && people.get(id)?.full_name?.trim()) || fallback;
  const personImage = (id: unknown) => (typeof id === "string" ? people.get(id)?.avatar_url ?? null : null);

  const sessions: LearningSession[] = [];

  for (const p of privates) {
    const startMs = ms(p.scheduled_at);
    const duration = num(p.duration_minutes) || 60;
    const cancellation = cancellations.find((c) => c.private_lesson_id === p.id);
    sessions.push({
      id: p.id as string,
      kind: "private",
      title: p.subject as string,
      subject: p.subject as string,
      personId: p.tutor_id as string,
      personName: personName(p.tutor_id, "Your tutor"),
      personImage: personImage(p.tutor_id),
      startMs,
      endMs: startMs + duration * 60_000,
      durationMinutes: duration,
      mode: (p.mode as string) ?? "Online",
      status: sessionStatus(p.status),
      paymentStatus: (p.payment_status as string) ?? null,
      price: num(p.price),
      bookingReference: (p.booking_reference as string) ?? null,
      notes: strOrNull(p.notes),
      seriesId: (p.booking_group_id as string) ?? null,
      frequency: (p.frequency as string) ?? null,
      sessionNumber: (p.session_number as number) ?? null,
      totalSessions: (p.total_sessions as number) ?? null,
      groupClassId: null,
      seatsFilled: null,
      seatsTotal: null,
      cancelledAtMs: p.cancelled_at ? ms(p.cancelled_at) : null,
      cancellationReason: strOrNull(p.cancellation_reason) ?? strOrNull(cancellation?.reason),
      refundAmount: cancellation ? num(cancellation.refund_amount) : null,
      confirmationId: null,
      classroomHref: `/student-dashboard/classroom/private/${p.id}`,
    });
  }

  for (const d of discoveries) {
    const startMs = ms(d.scheduled_start_at);
    const endMs = ms(d.scheduled_end_at) || startMs + 25 * 60_000;
    sessions.push({
      id: d.id as string,
      kind: "discovery",
      title: "Discovery Session",
      subject: (d.subject as string) ?? "",
      personId: (d.tutor_id as string) ?? null,
      personName: d.tutor_id ? personName(d.tutor_id, "Your tutor") : "Tutor to be assigned",
      personImage: personImage(d.tutor_id),
      startMs,
      endMs,
      durationMinutes: Math.round((endMs - startMs) / 60_000),
      mode: "Online",
      status: sessionStatus(d.status),
      paymentStatus: (d.payment_status as string) ?? null,
      price: num(d.price),
      bookingReference: (d.booking_reference as string) ?? null,
      notes: null,
      seriesId: null,
      frequency: null,
      sessionNumber: null,
      totalSessions: null,
      groupClassId: null,
      seatsFilled: null,
      seatsTotal: null,
      cancelledAtMs: null,
      cancellationReason: null,
      refundAmount: null,
      confirmationId: null,
      classroomHref: `/student-dashboard/discovery-sessions/${d.id}/classroom`,
    });
  }

  for (const c of counselling) {
    const startMs = ms(c.scheduled_at);
    const duration = num(c.duration_minutes) || 30;
    sessions.push({
      id: c.id as string,
      kind: "counselling",
      title: "Counselling Session",
      subject: "Counselling",
      personId: (c.counsellor_id as string) ?? null,
      personName: c.counsellor_id ? personName(c.counsellor_id, "Your counsellor") : "Counsellor to be assigned",
      personImage: personImage(c.counsellor_id),
      startMs,
      endMs: startMs + duration * 60_000,
      durationMinutes: duration,
      mode: "Online",
      status: sessionStatus(c.status),
      paymentStatus: null,
      price: 0,
      bookingReference: (c.booking_reference as string) ?? null,
      notes: null,
      seriesId: null,
      frequency: null,
      sessionNumber: null,
      totalSessions: null,
      groupClassId: null,
      seatsFilled: null,
      seatsTotal: null,
      cancelledAtMs: null,
      cancellationReason: null,
      refundAmount: null,
      confirmationId: null,
      classroomHref: `/student-dashboard/classroom/counselling/${c.id}`,
    });
  }

  for (const enrollment of enrollments) {
    const cohort = cohorts.find((c) => c.id === enrollment.cohort_id);
    const cls = cohort && classes.find((c) => c.id === cohort.group_class_id);
    if (!cohort || !cls) continue;
    const enrollmentCancelled = enrollment.status === "Cancelled";
    const cancellation = cancellations.find((c) => c.group_class_enrollment_id === enrollment.id);
    const duration = cohortDurationMinutes(cohort.schedule);
    const cohortSessions = ((groupSessionRows ?? []) as Row[]).filter((s) => s.cohort_id === cohort.id);
    for (const s of cohortSessions) {
      const startMs = ms(s.scheduled_at);
      // A cancelled enrollment only keeps the sessions it was cancelled out of.
      if (enrollmentCancelled && enrollment.cancelled_at && startMs < ms(enrollment.cancelled_at)) continue;
      sessions.push({
        id: s.id as string,
        kind: "group",
        title: cls.title as string,
        subject: cls.subject as string,
        personId: cls.tutor_id as string,
        personName: personName(cls.tutor_id, "Your tutor"),
        personImage: personImage(cls.tutor_id),
        startMs,
        endMs: startMs + duration * 60_000,
        durationMinutes: duration,
        mode: (cls.mode as string) ?? "Online",
        status: enrollmentCancelled ? "cancelled" : sessionStatus(s.status),
        paymentStatus: null,
        price: num(cohort.price),
        bookingReference: (enrollment.booking_reference as string) ?? null,
        notes: null,
        seriesId: enrollment.id as string,
        frequency: null,
        sessionNumber: (s.session_number as number) ?? null,
        totalSessions: cohortSessions.length,
        groupClassId: cls.id as string,
        seatsFilled: num(cohort.seats_filled),
        seatsTotal: num(cohort.seats_total),
        cancelledAtMs: enrollmentCancelled && enrollment.cancelled_at ? ms(enrollment.cancelled_at) : null,
        cancellationReason: enrollmentCancelled ? strOrNull(cancellation?.reason) : null,
        refundAmount: enrollmentCancelled && cancellation ? num(cancellation.refund_amount) : null,
        confirmationId: null,
        classroomHref: `/student-dashboard/classroom/group/${cls.id}`,
      });
    }
  }
  sessions.sort((a, b) => a.startMs - b.startMs);

  // Completed lessons. A lesson_confirmations row is the escrow record the
  // platform writes when a tutor marks a lesson done; it isn't linked to a
  // specific booking row, so match it to the session it most likely belongs
  // to (same tutor + subject, finished within a day of it) so the same
  // lesson never shows twice.
  const reviews = new Map(((reviewRows ?? []) as Row[]).filter((r) => r.booking_id).map((r) => [r.booking_id as string, { rating: num(r.rating), comment: (r.comment as string) ?? "" }]));
  const completed: CompletedLesson[] = [];
  for (const c of confirmations) {
    const completedAtMs = ms(c.completed_at);
    const match = sessions.find(
      (s) =>
        !s.confirmationId &&
        (s.kind === "private" || s.kind === "group") &&
        s.personId === c.tutor_id &&
        norm(s.subject) === norm(c.subject as string) &&
        Math.abs(s.endMs - completedAtMs) < 24 * 3_600_000
    );
    if (match) match.confirmationId = c.id as string;
    const confirmationStatus = c.confirmation_status as CompletedLesson["confirmationStatus"];
    const type = c.type === "Group" ? "group" : "private";
    completed.push({
      id: c.id as string,
      bookingType: type,
      subject: (match?.title ?? c.subject) as string,
      tutorId: c.tutor_id as string,
      tutorName: personName(c.tutor_id, "Your tutor"),
      tutorImage: personImage(c.tutor_id),
      completedAtMs,
      amount: num(c.amount_gross),
      confirmationStatus,
      escrowStatus: c.escrow_status as CompletedLesson["escrowStatus"],
      autoReleaseAtMs: ms(c.auto_release_at),
      // Group sessions clear automatically, so they're reviewable straight
      // away; a private lesson once the student confirmed it (or it auto-released).
      reviewable: confirmationStatus !== "Disputed" && (type === "group" || confirmationStatus === "Confirmed" || c.escrow_status === "Released"),
      review: reviews.get(c.id as string) ?? null,
      attended: type === "group" ? (attendance.get(c.id as string) ?? null) : null,
    });
  }
  // Lessons a tutor marked Completed without an escrow record.
  for (const s of sessions) {
    if (s.status !== "completed" || s.confirmationId || (s.kind !== "private" && s.kind !== "group") || !s.personId) continue;
    completed.push({
      id: s.id,
      bookingType: s.kind,
      subject: s.title,
      tutorId: s.personId,
      tutorName: s.personName,
      tutorImage: s.personImage,
      completedAtMs: s.endMs,
      amount: s.price || null,
      confirmationStatus: null,
      escrowStatus: null,
      autoReleaseAtMs: null,
      reviewable: true,
      review: reviews.get(s.id) ?? null,
      attended: null,
    });
  }
  completed.sort((a, b) => b.completedAtMs - a.completedAtMs);

  const studyTasks: StudyTaskRow[] = ((taskRows ?? []) as Row[]).map((t) => ({
    id: t.id as string,
    label: t.label as string,
    subject: strOrNull(t.subject),
    dueDate: (t.due_date as string) ?? null,
    done: t.done === true,
  }));

  const studentSubjects = [...(((student?.subjects as string[] | null) ?? [])), ...(student?.course ? [student.course as string] : [])];
  const studentLevel = (student?.academic_detail as string) || (student?.academic_level as string) || "";
  const [recommendedTutors, groupClassSuggestions] = await Promise.all([
    loadRecommendedTutors(studentSubjects, (student?.academic_level as string) ?? ""),
    loadGroupClassSuggestions(studentSubjects, studentLevel, (student?.academic_level as string) ?? "", new Set(classIds)),
  ]);

  return {
    generatedAtMs: nowMs,
    sessions,
    completed,
    studyTasks,
    recommendedTutors,
    savedTutorIds: ((savedRows ?? []) as Row[]).map((r) => r.tutor_id as string),
    groupClassSuggestions,
    notifications: ((notificationRows ?? []) as Row[]).map((n) => ({
      id: n.id as string,
      text: n.text as string,
      category: (n.category as string) ?? "",
      actionUrl: strOrNull(n.action_url),
      unread: n.unread === true,
      createdAtMs: ms(n.created_at),
    })),
    unreadNotifications: unreadCount ?? 0,
    unreadMessages: ((conversationRows ?? []) as Row[]).reduce((sum, c) => sum + num(c.unread_count), 0),
    homeworkScores: ((homeworkRows ?? []) as Row[]).flatMap((h) => {
      const score = parseGrade(h.grade);
      return score === null ? [] : [score];
    }),
    hasCounselling: counselling.length > 0,
  };
}

// Approved tutors whose registered subjects overlap the student's own
// subjects/course — never a tutor who merely exists, so "Recommended for
// you" is always honest about why. Best subject overlap first, then rating.
async function loadRecommendedTutors(studentSubjects: string[], academicLevel: string): Promise<RecommendedTutor[]> {
  if (studentSubjects.length === 0) return [];
  const admin = getServiceRoleClient();
  const { data: tutorRows } = await admin.from("tutor_profiles").select("id, application_data").eq("application_status", "approved").eq("profile_public", true);
  const tutors = (tutorRows ?? []) as { id: string; application_data: Record<string, unknown> | null }[];
  if (tutors.length === 0) return [];

  const levelHints = tutorLevelsForStudent(academicLevel);
  const scored = tutors
    .map((t) => {
      const app = parseTutorApplication(t.application_data);
      const matchedSubjects = subjectMatches(studentSubjects, app.subjects);
      const levelMatch = levelHints.length === 0 || app.levels.some((l) => levelHints.includes(norm(l)));
      return { id: t.id, app, matchedSubjects, score: matchedSubjects.length * 2 + (levelMatch ? 1 : 0) };
    })
    .filter((t) => t.matchedSubjects.length > 0);
  if (scored.length === 0) return [];

  const ids = scored.map((t) => t.id);
  const [{ data: peopleRows }, { data: ratingRows }] = await Promise.all([
    admin.from("profiles").select("id, full_name, avatar_url").in("id", ids),
    admin.from("reviews").select("recipient_id, rating").in("recipient_id", ids).eq("direction", "student_to_tutor").eq("status", "published"),
  ]);
  const people = new Map(((peopleRows ?? []) as Person[]).map((p) => [p.id, p]));
  const ratings = (ratingRows ?? []) as { recipient_id: string; rating: number }[];

  return scored
    .map((t) => {
      const mine = ratings.filter((r) => r.recipient_id === t.id);
      const rating = mine.length ? Math.round((mine.reduce((sum, r) => sum + r.rating, 0) / mine.length) * 10) / 10 : null;
      const price = Number(t.app.oneOnOnePrice);
      return {
        score: t.score,
        tutor: {
          id: t.id,
          name: people.get(t.id)?.full_name?.trim() || "Tutor",
          image: people.get(t.id)?.avatar_url ?? null,
          headline: t.app.headline,
          bio: t.app.bio,
          matchedSubjects: t.matchedSubjects,
          subjects: t.app.subjects,
          levels: t.app.levels,
          pricePerHour: Number.isFinite(price) && price > 0 ? price : null,
          rating,
          reviewCount: mine.length,
          country: [t.app.stateCity, t.app.country].filter(Boolean).join(", "),
          teachingDays: t.app.availability.map((a) => a.day),
        } satisfies RecommendedTutor,
      };
    })
    .sort((a, b) => b.score - a.score || (b.tutor.rating ?? 0) - (a.tutor.rating ?? 0))
    .slice(0, 3)
    .map((t) => t.tutor);
}

// Published group classes for the student's level (or subjects) that they
// aren't already in, with a cohort still taking students.
async function loadGroupClassSuggestions(studentSubjects: string[], level: string, academicLevel: string, enrolledClassIds: Set<string>): Promise<GroupClassSuggestion[]> {
  const admin = getServiceRoleClient();
  const { data: classRows } = await admin.from("group_classes").select("id, slug, title, subject, academic_level, class_grade, tutor_id").eq("status", "Published");
  const wantedLevels = [level, academicLevel].map(norm).filter(Boolean);
  const candidates = ((classRows ?? []) as Row[]).filter((c) => {
    if (enrolledClassIds.has(c.id as string)) return false;
    const classLevels = [c.academic_level, c.class_grade].map((v) => norm(String(v ?? ""))).filter(Boolean);
    const levelMatch = classLevels.some((l) => wantedLevels.includes(l));
    return levelMatch || subjectMatches(studentSubjects, [c.subject as string]).length > 0;
  });
  if (candidates.length === 0) return [];

  const ids = candidates.map((c) => c.id as string);
  const [{ data: cohortRows }, { data: peopleRows }] = await Promise.all([
    admin.from("group_class_cohorts").select("group_class_id, start_date, seats_total, seats_filled, price, status").in("group_class_id", ids).neq("status", "Cancelled").neq("status", "Completed").order("start_date"),
    admin.from("profiles").select("id, full_name, avatar_url").in("id", [...new Set(candidates.map((c) => c.tutor_id as string))]),
  ]);
  const people = new Map(((peopleRows ?? []) as Person[]).map((p) => [p.id, p]));
  const cohorts = (cohortRows ?? []) as Row[];

  return candidates
    .flatMap((c) => {
      const cohort = cohorts.find((k) => k.group_class_id === c.id && num(k.seats_filled) < num(k.seats_total));
      if (!cohort) return [];
      return [
        {
          id: c.id as string,
          slug: c.slug as string,
          title: c.title as string,
          subject: c.subject as string,
          level: ((c.class_grade || c.academic_level) as string) ?? "",
          tutorName: people.get(c.tutor_id as string)?.full_name?.trim() || "Tutor",
          tutorImage: people.get(c.tutor_id as string)?.avatar_url ?? null,
          seatsFilled: num(cohort.seats_filled),
          seatsTotal: num(cohort.seats_total),
          price: num(cohort.price),
          startDate: cohort.start_date as string,
        },
      ];
    })
    .slice(0, 2);
}
