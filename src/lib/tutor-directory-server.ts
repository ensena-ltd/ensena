// Server-only: the real tutor directory, tutor profiles and tutor schedules,
// read from Supabase. Only APPROVED tutors are ever listed or bookable. A
// tutor's profile/registration (tutor_profiles) isn't readable by students
// under RLS, so this uses the service-role client and exposes only the
// public-facing fields below — never contact details, ID documents or bank info.
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { UNPAID_HOLD_MINUTES, type BusyInterval, type WeeklyRange } from "@/lib/booking-slots";
import { parseTutorApplication, type TutorApplicationFields } from "@/lib/tutor-application";

export interface TutorDirectoryEntry {
  id: string;
  name: string;
  image: string | null;
  headline: string;
  bio: string;
  subjects: string[];
  levels: string[];
  exams: string[];
  languages: string[];
  country: string;
  pricePerHour: number | null;
  rating: number | null;
  reviewCount: number;
  yearsExperience: string;
  teachingModes: string[];
  memberSince: string;
  /** Completed private lessons on Ensena. */
  lessonsTaught: number;
  /** Days of the week (0 = Sunday) the tutor takes bookings; empty on vacation. */
  teachingDays: number[];
  /** Teaches after 5 PM on at least one day. */
  teachesEvenings: boolean;
  onVacation: boolean;
  /** Seen in the last 10 minutes (only when the tutor shares last-active). */
  online: boolean;
  /** One of the first 50 tutors approved on Ensena. */
  founding: boolean;
  discoveryEnabled: boolean;
  discoveryPrice: number | null;
  qualification: string;
  responseTime: string;
}

export interface TutorPublicReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName: string;
  tutorReply: string | null;
}

export interface TutorPublicProfile extends TutorDirectoryEntry {
  levelExpertise: { level: string; items: string[]; exams: string[] }[];
  teachingStyles: string[];
  qualification: string;
  institution: string;
  fieldOfStudy: string;
  cancellationPolicy: string;
  classDurations: number[];
  weekly: WeeklyRange[];
  reviews: TutorPublicReview[];
  completedLessons: number;
  /** Vacation Mode: the tutor has paused all new bookings. */
  onVacation: boolean;
  /** Only when the tutor shares their last-active status. */
  lastActiveAt: string | null;
  /** Students without a booking can message this tutor. */
  acceptsNewMessages: boolean;
  /** The tutor's preferred lesson length — preselected on the booking page. */
  defaultDuration: number;
  studentsTaught: number;
  /** Share of students with 2+ completed lessons, or null before any. */
  repeatStudentsPct: number | null;
  /** Share of this tutor's paid lessons the tutor cancelled, or null before any. */
  cancellationRatePct: number | null;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  trust: { identityVerified: boolean; backgroundChecked: boolean; profileComplete: boolean; reliable: boolean; overallVerified: boolean };
  teachingFormats: string[];
  sessionTypes: string[];
  groupClasses: { id: string; slug: string; title: string; subject: string; level: string; price: number; seatsFilled: number; seatsTotal: number; startDate: string | null }[];
}

type Person = { id: string; full_name: string | null; avatar_url: string | null; created_at: string; last_seen_at?: string | null };

const FOUNDING_LIMIT = 50;
const ONLINE_WINDOW_MS = 10 * 60_000;

type TutorFlags = { vacation_mode?: boolean | null; show_last_active?: boolean | null };

interface EntryExtras {
  lessonsTaught: number;
  weekly: WeeklyRange[];
  founding: boolean;
}

function weeklyFromApplication(app: Record<string, unknown> | null): WeeklyRange[] {
  const availability = app?.availability && typeof app.availability === "object" ? (app.availability as Record<string, { enabled?: boolean; ranges?: { start?: string; end?: string }[] }>) : {};
  return Object.entries(availability).flatMap(([day, d]) => {
    const dayOfWeek = DAY_INDEX[day.toLowerCase()];
    if (dayOfWeek === undefined || !d?.enabled) return [];
    return (d.ranges ?? []).filter((r) => r.start && r.end).map((r) => ({ dayOfWeek, start: r.start!, end: r.end! }));
  });
}

// The first FOUNDING_LIMIT tutors to join (by account creation) among those approved.
async function foundingTutorIds(): Promise<Set<string>> {
  const admin = getServiceRoleClient();
  const { data: approved } = await admin.from("tutor_profiles").select("id").eq("application_status", "approved");
  const ids = ((approved ?? []) as { id: string }[]).map((t) => t.id);
  if (ids.length === 0) return new Set();
  const { data } = await admin.from("profiles").select("id, created_at").in("id", ids).order("created_at").limit(FOUNDING_LIMIT);
  return new Set(((data ?? []) as { id: string }[]).map((p) => p.id));
}

const DAY_INDEX: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

function toEntry(id: string, person: Person | undefined, app: TutorApplicationFields, ratings: number[], flags: TutorFlags, extras: EntryExtras): TutorDirectoryEntry {
  const price = Number(app.oneOnOnePrice);
  const trial = Number(app.trialPrice);
  const onVacation = flags.vacation_mode === true;
  const weekly = onVacation ? [] : extras.weekly;
  const lastSeenMs = person?.last_seen_at ? new Date(person.last_seen_at).getTime() : 0;
  return {
    id,
    name: person?.full_name?.trim() || "Tutor",
    image: person?.avatar_url ?? null,
    headline: app.headline,
    bio: app.bio,
    subjects: app.subjects,
    levels: app.levels,
    exams: app.exams,
    languages: app.languages,
    country: [app.stateCity, app.country].filter(Boolean).join(", "),
    pricePerHour: Number.isFinite(price) && price > 0 ? price : null,
    rating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    reviewCount: ratings.length,
    yearsExperience: app.yearsExperience,
    teachingModes: app.teachingModes,
    memberSince: person?.created_at ?? "",
    lessonsTaught: extras.lessonsTaught,
    teachingDays: [...new Set(weekly.map((r) => r.dayOfWeek))].sort(),
    teachesEvenings: weekly.some((r) => r.end > "17:00"),
    onVacation,
    online: flags.show_last_active !== false && lastSeenMs > Date.now() - ONLINE_WINDOW_MS,
    founding: extras.founding,
    discoveryEnabled: app.discoverySession,
    discoveryPrice: app.discoverySession && Number.isFinite(trial) && trial > 0 ? trial : null,
    qualification: app.highestQualification,
    responseTime: app.responseTime,
  };
}

async function publishedRatings(tutorIds: string[]): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  if (tutorIds.length === 0) return map;
  const { data } = await getServiceRoleClient()
    .from("reviews")
    .select("recipient_id, rating")
    .in("recipient_id", tutorIds)
    .eq("direction", "student_to_tutor")
    .eq("status", "published");
  for (const r of (data ?? []) as { recipient_id: string; rating: number }[]) map.set(r.recipient_id, [...(map.get(r.recipient_id) ?? []), r.rating]);
  return map;
}

export async function listApprovedTutors(): Promise<TutorDirectoryEntry[]> {
  try {
    const admin = getServiceRoleClient();
    // A tutor who switched off Public Profile is hidden from browsing, but
    // students they already teach can still open their profile directly.
    const { data: tutorRows } = await admin
      .from("tutor_profiles")
      .select("id, application_data, vacation_mode, show_last_active")
      .eq("application_status", "approved")
      .eq("profile_public", true);
    const tutors = (tutorRows ?? []) as ({ id: string; application_data: Record<string, unknown> | null } & TutorFlags)[];
    if (tutors.length === 0) return [];
    const ids = tutors.map((t) => t.id);
    const [{ data: people }, ratings, { data: weeklyRows }, { data: completedRows }, founding] = await Promise.all([
      admin.from("profiles").select("id, full_name, avatar_url, created_at, last_seen_at").in("id", ids),
      publishedRatings(ids),
      admin.from("tutor_weekly_availability").select("tutor_id, day_of_week, enabled, start_time, end_time").in("tutor_id", ids),
      admin.from("private_lessons").select("tutor_id").in("tutor_id", ids).eq("status", "Completed"),
      foundingTutorIds(),
    ]);
    const byId = new Map(((people ?? []) as Person[]).map((p) => [p.id, p]));
    const savedHours = (weeklyRows ?? []) as { tutor_id: string; day_of_week: number; enabled: boolean; start_time: string; end_time: string }[];
    const lessonCounts = new Map<string, number>();
    for (const l of (completedRows ?? []) as { tutor_id: string }[]) lessonCounts.set(l.tutor_id, (lessonCounts.get(l.tutor_id) ?? 0) + 1);
    return tutors
      .map((t) => {
        // Hours saved in the dashboard win over the ones given at sign-up (same rule as loadTutorRegularHours).
        const own = savedHours.filter((r) => r.tutor_id === t.id);
        const weekly = own.length
          ? own.filter((r) => r.enabled).map((r) => ({ dayOfWeek: r.day_of_week, start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) }))
          : weeklyFromApplication(t.application_data);
        return toEntry(t.id, byId.get(t.id), parseTutorApplication(t.application_data), ratings.get(t.id) ?? [], t, {
          lessonsTaught: lessonCounts.get(t.id) ?? 0,
          weekly,
          founding: founding.has(t.id),
        });
      })
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name));
  } catch (error) {
    console.error("listApprovedTutors failed", error);
    return [];
  }
}

/**
 * The tutor's BOOKABLE weekly hours — empty while Vacation Mode is on, which
 * is what pauses new bookings and reschedules everywhere slots are checked.
 */
export async function loadTutorWeekly(tutorId: string, applicationData?: Record<string, unknown> | null): Promise<WeeklyRange[]> {
  const { data } = await getServiceRoleClient().from("tutor_profiles").select("vacation_mode").eq("id", tutorId).maybeSingle();
  if (data?.vacation_mode === true) return [];
  return loadTutorRegularHours(tutorId, applicationData);
}

/**
 * The tutor's regular weekly teaching hours (ignoring Vacation Mode).
 * tutor_weekly_availability wins when the tutor has rows there; otherwise
 * the hours they gave at registration.
 */
export async function loadTutorRegularHours(tutorId: string, applicationData?: Record<string, unknown> | null): Promise<WeeklyRange[]> {
  const admin = getServiceRoleClient();
  const { data: rows } = await admin.from("tutor_weekly_availability").select("day_of_week, enabled, start_time, end_time").eq("tutor_id", tutorId);
  const tableRows = (rows ?? []) as { day_of_week: number; enabled: boolean; start_time: string; end_time: string }[];
  // Once the tutor has saved their hours in the dashboard, those rows are
  // the whole truth — even if every day is switched off.
  if (tableRows.length > 0) {
    return tableRows.filter((r) => r.enabled).map((r) => ({ dayOfWeek: r.day_of_week, start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) }));
  }

  let app = applicationData;
  if (app === undefined) {
    const { data } = await admin.from("tutor_profiles").select("application_data").eq("id", tutorId).maybeSingle();
    app = (data?.application_data as Record<string, unknown> | null) ?? null;
  }
  return weeklyFromApplication(app ?? null);
}

// `opts.preview`: the tutor viewing their own profile — shown even before
// they're approved, exactly as students will see it.
export async function loadTutorProfile(tutorId: string, opts: { preview?: boolean } = {}): Promise<TutorPublicProfile | null> {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(tutorId)) return null;
    const admin = getServiceRoleClient();
    const { data: tutor } = await admin
      .from("tutor_profiles")
      .select("id, application_status, application_data, vacation_mode, show_last_active, allow_new_student_messages")
      .eq("id", tutorId)
      .maybeSingle();
    if (!tutor || (tutor.application_status !== "approved" && !opts.preview)) return null;
    const appData = (tutor.application_data as Record<string, unknown> | null) ?? null;
    const app = parseTutorApplication(appData);

    const [{ data: person }, { data: reviewRows }, weekly, { data: lessonRows }, { data: settings }, founding, { data: docRows }, { data: classRows }] = await Promise.all([
      admin.from("profiles").select("id, full_name, avatar_url, created_at, last_seen_at").eq("id", tutorId).maybeSingle(),
      admin
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id, tutor_reply")
        .eq("recipient_id", tutorId)
        .eq("direction", "student_to_tutor")
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      loadTutorRegularHours(tutorId, appData),
      admin.from("private_lessons").select("id, student_id, status").eq("tutor_id", tutorId).neq("payment_status", "unpaid"),
      admin.from("account_settings").select("default_lesson_duration").eq("user_id", tutorId).maybeSingle(),
      foundingTutorIds(),
      admin.from("tutor_verification_documents").select("doc_type, status").eq("tutor_id", tutorId),
      admin.from("group_classes").select("id, slug, title, subject, academic_level, class_grade").eq("tutor_id", tutorId).eq("status", "Published"),
    ]);
    const lessons = (lessonRows ?? []) as { id: string; student_id: string; status: string }[];
    const completed = lessons.filter((l) => l.status === "Completed");
    const completedLessons = completed.length;
    const perStudent = new Map<string, number>();
    for (const l of completed) perStudent.set(l.student_id, (perStudent.get(l.student_id) ?? 0) + 1);
    const studentsTaught = perStudent.size;
    const repeatStudentsPct = studentsTaught ? Math.round(([...perStudent.values()].filter((n) => n >= 2).length / studentsTaught) * 100) : null;
    const { count: tutorCancellations } = lessons.length
      ? await admin.from("cancellations").select("id", { count: "exact", head: true }).eq("cancelled_by", tutorId).in("private_lesson_id", lessons.map((l) => l.id))
      : { count: 0 };
    const cancellationRatePct = lessons.length ? Math.round(((tutorCancellations ?? 0) / lessons.length) * 100) : null;

    const classes = (classRows ?? []) as { id: string; slug: string; title: string; subject: string; academic_level: string | null; class_grade: string | null }[];
    const { data: cohortRows } = classes.length
      ? await admin
          .from("group_class_cohorts")
          .select("group_class_id, start_date, seats_total, seats_filled, price, status")
          .in("group_class_id", classes.map((c) => c.id))
          .neq("status", "Cancelled")
          .neq("status", "Completed")
          .order("start_date")
      : { data: [] };
    const cohorts = (cohortRows ?? []) as { group_class_id: string; start_date: string; seats_total: number; seats_filled: number; price: number | string }[];
    const reviews = (reviewRows ?? []) as { id: string; rating: number; comment: string | null; created_at: string; reviewer_id: string; tutor_reply: string | null }[];
    const { data: reviewers } = reviews.length
      ? await admin.from("profiles").select("id, full_name").in("id", [...new Set(reviews.map((r) => r.reviewer_id))])
      : { data: [] };
    // Students are shown as "First L." on a public profile.
    const shortName = (id: string) => {
      const full = ((reviewers ?? []) as { id: string; full_name: string | null }[]).find((p) => p.id === id)?.full_name?.trim() ?? "";
      const [first, ...rest] = full.split(/\s+/);
      return first ? `${first}${rest.length ? ` ${rest[rest.length - 1][0]}.` : ""}` : "Student";
    };

    const docs = (docRows ?? []) as { doc_type: string; status: string }[];
    const approved = tutor.application_status === "approved";
    const ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) if (r.rating >= 1 && r.rating <= 5) ratingBreakdown[r.rating as 1 | 2 | 3 | 4 | 5]++;

    const durations = app.classDurations.map((d) => parseInt(d, 10)).filter((n) => Number.isFinite(n) && n >= 15 && n <= 240);
    const classDurations = durations.length ? [...new Set(durations)].sort((a, b) => a - b) : [30, 45, 60, 90];
    const preferred = Number(settings?.default_lesson_duration);
    return {
      ...toEntry(tutorId, (person as Person | null) ?? undefined, app, reviews.map((r) => r.rating), tutor, { lessonsTaught: completedLessons, weekly, founding: founding.has(tutorId) }),
      levelExpertise: app.levelExpertise,
      teachingStyles: app.teachingStyles,
      qualification: app.highestQualification,
      institution: app.institution,
      fieldOfStudy: app.fieldOfStudy,
      cancellationPolicy: app.cancellationPolicy,
      classDurations,
      weekly,
      reviews: reviews.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment ?? "", createdAt: r.created_at, reviewerName: shortName(r.reviewer_id), tutorReply: r.tutor_reply })),
      completedLessons,
      studentsTaught,
      repeatStudentsPct,
      cancellationRatePct,
      ratingBreakdown,
      trust: {
        identityVerified: approved && docs.some((d) => /id|passport|licen|nin/i.test(d.doc_type) && d.status === "approved"),
        backgroundChecked: approved,
        profileComplete: Boolean(app.bio && app.headline && app.subjects.length && Number(app.oneOnOnePrice) > 0 && weekly.length && (person as Person | null)?.avatar_url),
        reliable: cancellationRatePct === null || cancellationRatePct <= 5,
        overallVerified: approved,
      },
      teachingFormats: app.teachingFormats,
      sessionTypes: app.sessionTypes,
      groupClasses: classes.map((c) => {
        const cohort = cohorts.find((k) => k.group_class_id === c.id);
        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          subject: c.subject,
          level: c.class_grade || c.academic_level || "",
          price: cohort ? Number(cohort.price) : 0,
          seatsFilled: cohort?.seats_filled ?? 0,
          seatsTotal: cohort?.seats_total ?? 0,
          startDate: cohort?.start_date ?? null,
        };
      }),
      onVacation: tutor.vacation_mode === true,
      lastActiveAt: tutor.show_last_active !== false ? ((person as { last_seen_at?: string | null } | null)?.last_seen_at ?? null) : null,
      acceptsNewMessages: tutor.allow_new_student_messages !== false,
      defaultDuration: classDurations.includes(preferred) ? preferred : classDurations.includes(60) ? 60 : classDurations[0],
    };
  } catch (error) {
    console.error("loadTutorProfile failed", error);
    return null;
  }
}

/**
 * Everything that makes a time unavailable when booking with `tutorId`:
 * the tutor's lessons, discovery sessions, group class sessions and blocked
 * time, plus the student's OWN classes (a student can't be in two lessons
 * at once). An unpaid booking only holds its slot for UNPAID_HOLD_MINUTES.
 * `exclude` leaves out lessons being rescheduled or paid for.
 */
export async function loadBusyIntervals(tutorId: string, studentId: string, fromMs: number, toMs: number, exclude?: string | string[]): Promise<BusyInterval[]> {
  const excluded = new Set(typeof exclude === "string" ? [exclude] : (exclude ?? []));
  const admin = getServiceRoleClient();
  const from = new Date(fromMs - 6 * 3_600_000).toISOString();
  const to = new Date(toMs).toISOString();
  const holdCutoff = Date.now() - UNPAID_HOLD_MINUTES * 60_000;

  const [{ data: lessons }, { data: discovery }, { data: blocked }, { data: tutorClasses }, { data: studentEnrollments }] = await Promise.all([
    admin
      .from("private_lessons")
      .select("id, scheduled_at, duration_minutes, status, payment_status, updated_at")
      .or(`tutor_id.eq.${tutorId},student_id.eq.${studentId}`)
      .neq("status", "Cancelled")
      .gte("scheduled_at", from)
      .lte("scheduled_at", to),
    admin
      .from("discovery_sessions")
      .select("scheduled_start_at, scheduled_end_at")
      .or(`tutor_id.eq.${tutorId},student_id.eq.${studentId}`)
      .eq("status", "Scheduled")
      .gte("scheduled_start_at", from)
      .lte("scheduled_start_at", to),
    admin.from("tutor_blocked_time").select("start_at, end_at").eq("tutor_id", tutorId).lte("start_at", to).gte("end_at", from),
    admin.from("group_classes").select("id").eq("tutor_id", tutorId).neq("status", "Cancelled"),
    admin.from("group_class_enrollments").select("cohort_id").eq("student_id", studentId).eq("status", "Active"),
  ]);

  const busy: BusyInterval[] = [];
  for (const l of (lessons ?? []) as { id: string; scheduled_at: string; duration_minutes: number; status: string; payment_status: string; updated_at: string }[]) {
    if (excluded.has(l.id)) continue;
    // An unpaid booking's hold is renewed (updated_at) each time checkout starts.
    const unpaidHoldExpired = l.status === "Pending" && l.payment_status === "unpaid" && new Date(l.updated_at).getTime() < holdCutoff;
    if (unpaidHoldExpired) continue;
    const startMs = new Date(l.scheduled_at).getTime();
    busy.push({ startMs, endMs: startMs + (l.duration_minutes || 60) * 60_000 });
  }
  for (const d of (discovery ?? []) as { scheduled_start_at: string; scheduled_end_at: string }[]) {
    busy.push({ startMs: new Date(d.scheduled_start_at).getTime(), endMs: new Date(d.scheduled_end_at).getTime() });
  }
  for (const b of (blocked ?? []) as { start_at: string; end_at: string }[]) {
    busy.push({ startMs: new Date(b.start_at).getTime(), endMs: new Date(b.end_at).getTime() });
  }

  // Group class sessions: the tutor's own classes + classes the student is in.
  const tutorClassIds = ((tutorClasses ?? []) as { id: string }[]).map((c) => c.id);
  const { data: tutorCohorts } = tutorClassIds.length ? await admin.from("group_class_cohorts").select("id, schedule").in("group_class_id", tutorClassIds) : { data: [] };
  const studentCohortIds = ((studentEnrollments ?? []) as { cohort_id: string }[]).map((e) => e.cohort_id);
  const { data: studentCohorts } = studentCohortIds.length ? await admin.from("group_class_cohorts").select("id, schedule").in("id", studentCohortIds) : { data: [] };
  const cohorts = [...((tutorCohorts ?? []) as { id: string; schedule: Record<string, unknown> | null }[]), ...((studentCohorts ?? []) as { id: string; schedule: Record<string, unknown> | null }[])];
  if (cohorts.length) {
    const { data: sessions } = await admin
      .from("group_class_sessions")
      .select("cohort_id, scheduled_at")
      .in("cohort_id", [...new Set(cohorts.map((c) => c.id))])
      .neq("status", "Cancelled")
      .gte("scheduled_at", from)
      .lte("scheduled_at", to);
    for (const s of (sessions ?? []) as { cohort_id: string; scheduled_at: string }[]) {
      const schedule = cohorts.find((c) => c.id === s.cohort_id)?.schedule ?? {};
      const minutes = Number(schedule.durationMinutes ?? schedule.duration_minutes ?? schedule.duration) || 60;
      const startMs = new Date(s.scheduled_at).getTime();
      busy.push({ startMs, endMs: startMs + minutes * 60_000 });
    }
  }
  return busy;
}
