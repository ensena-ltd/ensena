// Server-only: published group classes from the database, shaped as the same
// GroupClassListing the group-class pages already render.
import { timeRange } from "@/components/student-dashboard/live/tutor-ui";
import { buildPricing, type Cohort, type GroupClassListing } from "@/lib/group-classes-data";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { listApprovedTutors, loadTutorProfile, type TutorDirectoryEntry } from "@/lib/tutor-directory-server";

type Row = Record<string, unknown>;

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const FALLBACK_IMAGE = "/brand/icon.png";

export interface CohortSchedule {
  days: number[];
  time: string;
  durationMinutes: number;
  weeks: number;
}

export function parseSchedule(raw: unknown): CohortSchedule {
  const s = (raw ?? {}) as Record<string, unknown>;
  const days = Array.isArray(s.days) ? (s.days as unknown[]).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
  const time = typeof s.time === "string" && /^\d{2}:\d{2}$/.test(s.time) ? s.time : "17:00";
  const durationMinutes = Number(s.durationMinutes) > 0 ? Number(s.durationMinutes) : 60;
  const weeks = Number(s.weeks) > 0 ? Number(s.weeks) : 1;
  return { days, time, durationMinutes, weeks };
}

/** "Mon, Wed, Fri" (Monday first). */
export function daysLabel(days: number[]): string {
  return MONDAY_FIRST.filter((d) => days.includes(d)).map((d) => DAY_ABBR[d]).join(", ");
}

export interface LoadedCohort extends Cohort {
  id: string;
  sessionCount: number;
  pricePerSession: number;
  price: number;
  status: string;
  sessionIds: string[];
}

interface ClassBundle {
  row: Row;
  cohorts: LoadedCohort[];
}

/** Open cohorts (not cancelled/completed, with sessions still to come) for these classes. */
async function loadOpenCohorts(classIds: string[]): Promise<Map<string, LoadedCohort[]>> {
  const out = new Map<string, LoadedCohort[]>();
  if (classIds.length === 0) return out;
  const admin = getServiceRoleClient();
  const { data: cohortRows } = await admin
    .from("group_class_cohorts")
    .select("id, group_class_id, start_date, schedule, seats_total, seats_filled, price, status")
    .in("group_class_id", classIds)
    .not("status", "in", "(Cancelled,Completed)")
    .order("start_date");
  const cohorts = (cohortRows ?? []) as Row[];
  if (cohorts.length === 0) return out;
  const { data: sessionRows } = await admin
    .from("group_class_sessions")
    .select("id, cohort_id, scheduled_at, status")
    .in("cohort_id", cohorts.map((c) => c.id as string))
    .neq("status", "Cancelled")
    .order("scheduled_at");
  const sessions = (sessionRows ?? []) as Row[];
  const nowMs = Date.now();

  for (const c of cohorts) {
    const own = sessions.filter((s) => s.cohort_id === c.id);
    if (!own.some((s) => s.status === "Scheduled" && new Date(s.scheduled_at as string).getTime() > nowMs)) continue;
    const schedule = parseSchedule(c.schedule);
    const price = Number(c.price) || 0;
    const sessionCount = own.length;
    const cohort: LoadedCohort = {
      id: c.id as string,
      startDate: c.start_date as string,
      days: daysLabel(schedule.days),
      time: timeRange(schedule.time, schedule.durationMinutes),
      durationWeeks: schedule.weeks,
      seatsTotal: Number(c.seats_total) || 0,
      seatsFilled: Number(c.seats_filled) || 0,
      sessionCount,
      pricePerSession: sessionCount > 0 ? Math.round(price / sessionCount) : price,
      price,
      status: c.status as string,
      sessionIds: own.map((s) => s.id as string),
    };
    const list = out.get(c.group_class_id as string) ?? [];
    list.push(cohort);
    out.set(c.group_class_id as string, list);
  }
  return out;
}

function toListing(bundle: ClassBundle, tutor: TutorDirectoryEntry | undefined, fallbackTutor: { name: string; image: string | null } | undefined): GroupClassListing {
  const { row, cohorts } = bundle;
  const first = cohorts.find((c) => c.seatsFilled < c.seatsTotal) ?? cohorts[0];
  const sessionsPerWeek = Math.max(1, first.days.split(",").filter(Boolean).length);
  const outcomes = Array.isArray(row.learning_outcomes) ? (row.learning_outcomes as unknown[]).map(String).filter(Boolean) : [];
  const level = (row.academic_level as string | null)?.trim() || "All levels";
  const tutorName = tutor?.name ?? fallbackTutor?.name ?? "Tutor";
  return {
    slug: row.slug as string,
    title: row.title as string,
    description: (row.description as string | null)?.trim() || "",
    levelBadge: level,
    gradeLevel: (row.class_grade as string | null)?.trim() || level,
    subject: row.subject as string,
    supportTypes: ["tutoring"],
    days: first.days,
    time: first.time,
    price: first.pricePerSession,
    rating: tutor?.rating ?? 0,
    reviews: tutor?.reviewCount ?? 0,
    enrolled: first.seatsFilled,
    maxSeats: first.seatsTotal,
    mode: row.mode === "In-person" ? "In-person" : "Online",
    image: tutor?.image || fallbackTutor?.image || (row.banner_url as string | null) || FALLBACK_IMAGE,
    ringColor: "#6C63FF",
    badgeColor: "#EEF2FF",
    tutorName,
    language: (row.language as string | null) || "English",
    difficulty: "Intermediate",
    completionRate: 0,
    learningOutcomes: outcomes,
    outcomeSentence: "",
    cohorts,
    pricing: buildPricing(first.pricePerSession, sessionsPerWeek),
    live: {
      id: row.id as string,
      tutorId: row.tutor_id as string,
      tutorVerified: Boolean(tutor),
      tutorFounding: tutor?.founding ?? false,
      tutorExperience: tutor?.yearsExperience ?? "",
      reviewList: [],
      enrolledSessionId: null,
    },
  };
}

async function buildListings(rows: Row[], studentId?: string | null): Promise<GroupClassListing[]> {
  if (rows.length === 0) return [];
  const admin = getServiceRoleClient();
  const classIds = rows.map((r) => r.id as string);
  const tutorIds = [...new Set(rows.map((r) => r.tutor_id as string))];
  const [cohortsByClass, tutors, { data: people }] = await Promise.all([
    loadOpenCohorts(classIds),
    listApprovedTutors(),
    admin.from("profiles").select("id, full_name, avatar_url").in("id", tutorIds),
  ]);
  const tutorById = new Map(tutors.map((t) => [t.id, t]));
  const personById = new Map(((people ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]).map((p) => [p.id, { name: p.full_name?.trim() || "Tutor", image: p.avatar_url }]));

  const listings = rows
    .filter((r) => (cohortsByClass.get(r.id as string) ?? []).length > 0)
    .map((r) => toListing({ row: r, cohorts: cohortsByClass.get(r.id as string)! }, tutorById.get(r.tutor_id as string), personById.get(r.tutor_id as string)));

  if (studentId && listings.length > 0) {
    const enrolled = await enrolledSessionByClass(studentId, listings);
    for (const l of listings) l.live!.enrolledSessionId = enrolled.get(l.live!.id) ?? null;
  }
  return listings;
}

/** For each class the student is actively enrolled in: the session to open (next upcoming, else the last one). */
async function enrolledSessionByClass(studentId: string, listings: GroupClassListing[]): Promise<Map<string, string>> {
  const admin = getServiceRoleClient();
  const out = new Map<string, string>();
  const classIds = listings.map((l) => l.live!.id);
  const { data: cohortRows } = await admin.from("group_class_cohorts").select("id, group_class_id").in("group_class_id", classIds);
  const cohortClass = new Map(((cohortRows ?? []) as Row[]).map((c) => [c.id as string, c.group_class_id as string]));
  if (cohortClass.size === 0) return out;
  const { data: enrollments } = await admin.from("group_class_enrollments").select("cohort_id").eq("student_id", studentId).eq("status", "Active").in("cohort_id", [...cohortClass.keys()]);
  const cohortIds = ((enrollments ?? []) as Row[]).map((e) => e.cohort_id as string);
  if (cohortIds.length === 0) return out;
  const { data: sessions } = await admin.from("group_class_sessions").select("id, cohort_id, scheduled_at").in("cohort_id", cohortIds).neq("status", "Cancelled").order("scheduled_at");
  const nowMs = Date.now();
  const nextUpcoming = new Map<string, string>();
  for (const s of (sessions ?? []) as Row[]) {
    const classId = cohortClass.get(s.cohort_id as string)!;
    out.set(classId, s.id as string); // ends as the last session
    if (new Date(s.scheduled_at as string).getTime() > nowMs && !nextUpcoming.has(classId)) nextUpcoming.set(classId, s.id as string);
  }
  for (const [classId, id] of nextUpcoming) out.set(classId, id);
  return out;
}

/** Every published class with an open cohort. */
export async function loadPublishedGroupClasses(studentId?: string | null): Promise<GroupClassListing[]> {
  try {
    const { data } = await getServiceRoleClient().from("group_classes").select("*").eq("status", "Published").order("created_at", { ascending: false });
    return await buildListings((data ?? []) as Row[], studentId);
  } catch (error) {
    console.error("loadPublishedGroupClasses failed", error);
    return [];
  }
}

/** One published class by slug, with its tutor's real reviews. */
export async function loadGroupClassBySlug(slug: string, studentId?: string | null): Promise<GroupClassListing | null> {
  const { data } = await getServiceRoleClient().from("group_classes").select("*").eq("slug", slug).eq("status", "Published").maybeSingle();
  if (!data) return null;
  const [listing] = await buildListings([data as Row], studentId);
  if (!listing) return null;
  const profile = await loadTutorProfile(listing.live!.tutorId);
  if (profile) {
    listing.live!.reviewList = profile.reviews.filter((r) => r.comment.trim()).slice(0, 3).map((r) => ({ name: r.reviewerName, stars: r.rating, text: r.comment }));
  }
  return listing;
}

/** Same-subject classes first, then others. */
export function similarClasses(all: GroupClassListing[], cls: GroupClassListing, count = 3): GroupClassListing[] {
  const others = all.filter((c) => c.slug !== cls.slug);
  return [...others.filter((c) => c.subject === cls.subject), ...others.filter((c) => c.subject !== cls.subject)].slice(0, count);
}
