import { buildBookingReference } from "@/lib/booking-reference";
import { parseLegacyDateTime } from "@/lib/class-entry-access";

export type DiscoverySessionStatus = "Upcoming" | "Completed" | "Cancelled" | "No Show";
export type DiscoveryFitRating = "Excellent Fit" | "Good Fit" | "Not Sure" | "Not a Good Fit";
export type DiscoveryPaymentStatus = "Held" | "Released" | "Disputed" | "Refunded";
export type DiscoveryConversionStatus = "Pending" | "Continued" | "Not Continued" | "Disappeared";
// Which specific offering a "Continued" outcome converted into — kept as its
// own field rather than joined into DiscoveryConversionStatus with a dash
// ("Continued - Package"), so a display surface can compose "Continued ·
// Package" (this app's own established way of joining two separate facts)
// instead of rendering one pre-joined, hyphenated string.
export type DiscoveryConversionChannel = "Private Lessons" | "Package" | "Group Class";

// The funnel-tracking fields below are additive — they layer a precise
// booking→classroom→feedback→conversion state machine on top of the
// existing coarse `status`/`fitRating`/`conversionStatus` fields (which many
// list/badge views already filter on and stay untouched) rather than
// replacing them.
export type DiscoveryFunnelStage = "Booked" | "Scheduled" | "InProgress" | "CompletedAwaitingFeedback" | "FeedbackReceived";
export type DiscoveryTutorSelection = "Undecided" | "Selected" | "NotSelected";
export type DiscoveryConversionOutcome = "Pending" | "Converted" | "NotConverted";

export interface DiscoverySession {
  id: string;
  // Public-facing "Lesson ID" shown to students/tutors/support instead of
  // `id` — see src/lib/booking-reference.ts.
  bookingReference: string;
  tutor: string;
  tutorImage: string;
  student: string;
  studentImage: string;
  subject: string;
  date: string;
  time: string;
  durationMins: 20 | 25 | 30;
  price: number;
  status: DiscoverySessionStatus;
  meetingLink?: string;
  fitRating?: DiscoveryFitRating;
  onTimeArrival?: boolean;
  overallRating?: number;
  studentComment?: string;
  continued?: boolean;
  notes?: string;
  conversionStatus?: DiscoveryConversionStatus;
  conversionChannel?: DiscoveryConversionChannel;
  paymentStatus?: DiscoveryPaymentStatus;
  savedByStudent?: boolean;
  followingTutor?: boolean;
  materials?: string[];
  /** Real wall-clock timestamps, set once at booking time — the classroom's
   * countdown/hard-stop for a Discovery Class is computed against
   * `scheduledEndAtISO` rather than "N minutes after whoever joined first,"
   * per the product's own 25-minute-maximum requirement. */
  scheduledStartAtISO?: string;
  scheduledEndAtISO?: string;
  actualEndAtISO?: string;
  endedBy?: "schedule" | "tutor" | "violation";
  funnelStage?: DiscoveryFunnelStage;
  tutorSelection?: DiscoveryTutorSelection;
  conversionOutcome?: DiscoveryConversionOutcome;
}

// Real start/end epoch-ms for this session's entry window — prefers the
// real wall-clock timestamps set at booking time (scheduledStartAtISO/
// scheduledEndAtISO, present on a runtime-booked session) and only falls
// back to parsing the legacy display strings ("Today"/"4:00 PM") for the
// older seed rows that predate those fields. This is what
// getClassEntryState (class-entry-access.ts) needs to decide whether
// "Enter Classroom" should actually be enterable right now — never a
// fragile `date !== "Today"` string check, which silently and permanently
// disables entry for any session whose date is a real calendar date rather
// than that one literal word.
export function getDiscoverySessionTimeRange(session: DiscoverySession): { startMs: number; endMs: number } {
  if (session.scheduledStartAtISO && session.scheduledEndAtISO) {
    return { startMs: new Date(session.scheduledStartAtISO).getTime(), endMs: new Date(session.scheduledEndAtISO).getTime() };
  }
  const startMs = parseLegacyDateTime(session.date, session.time);
  return { startMs, endMs: startMs + session.durationMins * 60_000 };
}

export function computeReadinessScore(session: DiscoverySession): number {
  let score = 60;
  if (session.onTimeArrival) score += 10;
  if (session.overallRating && session.overallRating >= 4) score += 15;
  if (session.fitRating === "Excellent Fit") score += 15;
  else if (session.fitRating === "Good Fit") score += 8;
  else if (session.fitRating === "Not a Good Fit") score -= 20;
  return Math.max(0, Math.min(100, score));
}

export function computeCompatibilityScore(session: DiscoverySession): number {
  const base = session.overallRating ? session.overallRating * 20 : 70;
  const fitBoost =
    session.fitRating === "Excellent Fit" ? 10 : session.fitRating === "Good Fit" ? 4 : session.fitRating === "Not a Good Fit" ? -25 : -5;
  return Math.max(0, Math.min(100, Math.round(base + fitBoost)));
}

export function computeChurnRisk(session: DiscoverySession): "Low" | "Medium" | "High" {
  const readiness = computeReadinessScore(session);
  if (session.fitRating === "Not a Good Fit" || readiness < 45) return "High";
  if (session.fitRating === "Not Sure" || readiness < 70) return "Medium";
  return "Low";
}

const rawDiscoverySessions: Omit<DiscoverySession, "bookingReference">[] = [
  {
    id: "ds-1",
    tutor: "Adaeze Okonkwo",
    tutorImage: "/teacher-2.jpg.png",
    student: "Sarah Johnson",
    studentImage: "/teacher-4.jpg.png",
    subject: "Mathematics",
    date: "Today",
    time: "4:00 PM",
    durationMins: 25,
    price: 2000,
    status: "Upcoming",
    meetingLink: "https://ensena.co/room/ds-ab12",
    paymentStatus: "Held",
    conversionStatus: "Pending",
  },
  {
    id: "ds-2",
    tutor: "Adaeze Okonkwo",
    tutorImage: "/teacher-2.jpg.png",
    student: "David Okonkwo",
    studentImage: "/teacher-1.jpg.png",
    subject: "Mathematics",
    date: "Tomorrow",
    time: "5:00 PM",
    durationMins: 25,
    price: 2000,
    status: "Upcoming",
    meetingLink: "https://ensena.co/room/ds-cd34",
    paymentStatus: "Held",
    conversionStatus: "Pending",
  },
  {
    id: "ds-3",
    tutor: "Michael Adewale",
    tutorImage: "/teacher-3.jpg.png",
    student: "Ibrahim Bello",
    studentImage: "/teacher-3.jpg.png",
    subject: "Physics",
    date: "May 20, 2024",
    time: "3:00 PM",
    durationMins: 25,
    price: 1500,
    status: "Completed",
    fitRating: "Excellent Fit",
    onTimeArrival: true,
    overallRating: 5,
    studentComment: "Amazing tutor, explained everything so clearly!",
    continued: true,
    notes: "Strong rapport, student booked a 10-lesson package immediately after.",
    conversionStatus: "Continued",
    conversionChannel: "Package",
    paymentStatus: "Released",
    followingTutor: true,
  },
  {
    id: "ds-4",
    tutor: "Adaeze Okonkwo",
    tutorImage: "/teacher-2.jpg.png",
    student: "Fatima Bello",
    studentImage: "/teacher-4.jpg.png",
    subject: "Mathematics",
    date: "May 18, 2024",
    time: "2:00 PM",
    durationMins: 20,
    price: 2000,
    status: "Completed",
    fitRating: "Good Fit",
    onTimeArrival: true,
    overallRating: 4,
    studentComment: "Continued with weekly lessons.",
    continued: true,
    notes: "Continued with weekly lessons.",
    conversionStatus: "Continued",
    conversionChannel: "Private Lessons",
    paymentStatus: "Released",
  },
  {
    id: "ds-5",
    tutor: "Grace Williams",
    tutorImage: "/teacher-1.jpg.png",
    student: "Tunde Fashola",
    studentImage: "/teacher-1.jpg.png",
    subject: "French",
    date: "May 15, 2024",
    time: "6:00 PM",
    durationMins: 25,
    price: 1000,
    status: "Completed",
    fitRating: "Not Sure",
    onTimeArrival: true,
    overallRating: 3,
    studentComment: "Student wanted a male tutor; recommended alternatives.",
    continued: false,
    notes: "Student wanted a male tutor; recommended alternatives.",
    conversionStatus: "Not Continued",
    paymentStatus: "Released",
  },
  {
    id: "ds-6",
    tutor: "Zainab Yusuf",
    tutorImage: "/teacher-4.jpg.png",
    student: "Grace Adamu",
    studentImage: "/teacher-2.jpg.png",
    subject: "Biology",
    date: "May 12, 2024",
    time: "4:30 PM",
    durationMins: 25,
    price: 1500,
    status: "Cancelled",
  },
  {
    id: "ds-7",
    tutor: "Tunde Adebayo",
    tutorImage: "/teacher-3.jpg.png",
    student: "Daniel Adewale",
    studentImage: "/teacher-3.jpg.png",
    subject: "Mathematics",
    date: "May 10, 2024",
    time: "1:00 PM",
    durationMins: 20,
    price: 1200,
    status: "No Show",
    conversionStatus: "Disappeared",
  },
];

// Deterministic (keyed off the record's own id), not truly random — see the
// matching comment in admin-bookings-data.ts for why.
export const discoverySessions: DiscoverySession[] = rawDiscoverySessions.map((d) => ({ ...d, bookingReference: buildBookingReference("discovery", d.id) }));

export interface TutorDiscoverySettings {
  enabled: boolean;
  price: number;
  durationMins: 20 | 25 | 30;
  minPrice: number;
  maxPrice: number;
  maxDailySessions: number;
}

// Discovery Sessions are a free, platform-wide policy — tutors can no
// longer set a price for them. `price` stays in the shape (rather than
// being removed) since historical session records still carry the field.
// Duration is likewise a fixed platform policy, not a per-tutor choice —
// every Discovery Session is a maximum of 25 minutes, a hard limit that
// must never stretch into a 45/60-minute or open-ended lesson (see the
// booking client, which now hardcodes 25 regardless of this constant, and
// the Settings tab, which shows this as read-only). `durationMins` stays
// `20 | 25 | 30` on the type only so historical seed/session records booked
// under the old variable-duration policy remain valid.
export const defaultTutorDiscoverySettings: TutorDiscoverySettings = {
  enabled: true,
  price: 0,
  durationMins: 25,
  minPrice: 0,
  maxPrice: 0,
  maxDailySessions: 4,
};

// Anti-abuse rule: a student gets one free Discovery Session per tutor.
// Admin-configurable; overriding it to false removes the limit entirely.
export const oneFreeDiscoveryPerTutor = true;

function discoveryCompletedKey(tutorSlug: string): string {
  return `ensena_discovery_completed_${tutorSlug}`;
}

export const DISCOVERY_COMPLETED_EVENT = "ensena:discovery-completed-changed";

export function hasCompletedFreeDiscovery(tutorSlug: string): boolean {
  if (!oneFreeDiscoveryPerTutor || typeof window === "undefined") return false;
  return window.localStorage.getItem(discoveryCompletedKey(tutorSlug)) === "true";
}

export function markFreeDiscoveryCompleted(tutorSlug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(discoveryCompletedKey(tutorSlug), "true");
  window.dispatchEvent(new CustomEvent(DISCOVERY_COMPLETED_EVENT));
}

export function subscribeDiscoveryCompleted(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(DISCOVERY_COMPLETED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(DISCOVERY_COMPLETED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export const discoverySessionStatusStyles: Record<DiscoverySessionStatus, string> = {
  Upcoming: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-700",
  "No Show": "bg-amber-100 text-amber-700",
};

export const discoveryPaymentStatusStyles: Record<DiscoveryPaymentStatus, string> = {
  Held: "bg-amber-100 text-amber-700",
  Released: "bg-emerald-100 text-emerald-700",
  Disputed: "bg-rose-100 text-rose-700",
  Refunded: "bg-slate-100 text-slate-600",
};

export const discoverySessionStats = {
  total: discoverySessions.length,
  upcoming: discoverySessions.filter((d) => d.status === "Upcoming").length,
  completed: discoverySessions.filter((d) => d.status === "Completed").length,
  cancelled: discoverySessions.filter((d) => d.status === "Cancelled").length,
  noShows: discoverySessions.filter((d) => d.status === "No Show").length,
  revenue: discoverySessions.filter((d) => d.status === "Completed").reduce((s, d) => s + d.price, 0),
  escrowPending: discoverySessions.filter((d) => d.paymentStatus === "Held").reduce((s, d) => s + d.price, 0),
  conversionRatePct: Math.round(
    (discoverySessions.filter((d) => d.status === "Completed" && d.continued).length /
      Math.max(1, discoverySessions.filter((d) => d.status === "Completed").length)) *
      100
  ),
  avgRating: 4.7,
  studentsContinuing: discoverySessions.filter((d) => d.continued).length,
  studentsDroppingOff: discoverySessions.filter((d) => d.status === "Completed" && !d.continued).length,
  avgTimeToContinueDays: 2,
};

export interface RecommendedTutor {
  id: string;
  name: string;
  image: string;
  subject: string;
  rating: number;
  price: number;
  durationMins: 20 | 25 | 30;
  nextAvailable: string;
}

export const recommendedTutors: RecommendedTutor[] = [
  { id: "rt-1", name: "Grace Williams", image: "/teacher-1.jpg.png", subject: "French", rating: 4.9, price: 1500, durationMins: 25, nextAvailable: "Today, 6:00 PM" },
  { id: "rt-2", name: "Tunde Adebayo", image: "/teacher-3.jpg.png", subject: "Mathematics", rating: 4.9, price: 2000, durationMins: 25, nextAvailable: "Tomorrow, 3:00 PM" },
  { id: "rt-3", name: "Michael Adewale", image: "/teacher-3.jpg.png", subject: "Physics", rating: 4.95, price: 1500, durationMins: 25, nextAvailable: "Tomorrow, 5:00 PM" },
  { id: "rt-4", name: "Zainab Yusuf", image: "/teacher-4.jpg.png", subject: "Biology", rating: 4.8, price: 1500, durationMins: 25, nextAvailable: "Fri, 4:00 PM" },
  { id: "rt-5", name: "Adaeze Okonkwo", image: "/teacher-2.jpg.png", subject: "Mathematics", rating: 4.98, price: 1800, durationMins: 25, nextAvailable: "Fri, 10:00 AM" },
];
