import { groupClassListings } from "@/lib/group-classes-data";

// Lightweight, homepage-only view of upcoming group classes — subject,
// teacher, schedule and seats — for the "Weekend Classes"/"Evening
// Classes"/"Group Classes Starting Soon" discovery sections. Derived
// directly from groupClassListings (the same dataset the real booking page
// at /group-classes/[slug] reads via getGroupClassBySlug), specifically so
// `slug` here is a real, routable class id and every "View Class" button
// opens that exact class's existing booking page — never a placeholder.
export interface UpcomingGroupClass {
  slug: string;
  subject: string;
  teacherName: string;
  teacherImage: string;
  dayLabel: string;
  timeLabel: string;
  startDateLabel: string;
  startDateISO: string;
  price: number;
  maxSeats: number;
  seatsEnrolled: number;
  mode: "Online" | "Physical";
}

function firstTimeToken(time: string): string {
  return time.split(/[–-]/)[0].trim();
}

function weekdayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

function dateLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Each listing's nearest upcoming cohort (see buildCohorts in
// group-classes-data.ts) supplies a real, concrete date/time/seat count —
// recomputed relative to today on every load, so this never drifts stale.
export const upcomingGroupClasses: UpcomingGroupClass[] = groupClassListings.map((listing) => {
  const cohort = listing.cohorts[0];
  return {
    slug: listing.slug,
    subject: listing.subject,
    teacherName: listing.tutorName,
    teacherImage: listing.image,
    dayLabel: weekdayLabel(cohort.startDate),
    timeLabel: firstTimeToken(cohort.time),
    startDateLabel: dateLabel(cohort.startDate),
    startDateISO: cohort.startDate,
    price: listing.price,
    maxSeats: cohort.seatsTotal,
    seatsEnrolled: cohort.seatsFilled,
    mode: listing.mode === "In-person" ? "Physical" : "Online",
  };
});

export function weekendClasses(count = 8): UpcomingGroupClass[] {
  return upcomingGroupClasses
    .filter((c) => c.dayLabel === "Sat" || c.dayLabel === "Sun")
    .sort((a, b) => a.startDateISO.localeCompare(b.startDateISO))
    .slice(0, count);
}

function startHour(timeLabel: string): number {
  const match = timeLabel.match(/(\d+):\d+\s*(AM|PM)/);
  if (!match) return 0;
  let hour = Number(match[1]);
  if (match[2] === "PM" && hour !== 12) hour += 12;
  return hour;
}

export function eveningClasses(count = 8): UpcomingGroupClass[] {
  return upcomingGroupClasses
    .filter((c) => startHour(c.timeLabel) >= 16)
    .sort((a, b) => a.startDateISO.localeCompare(b.startDateISO))
    .slice(0, count);
}

export function startingSoonClasses(count = 8): UpcomingGroupClass[] {
  return [...upcomingGroupClasses]
    .sort((a, b) => a.startDateISO.localeCompare(b.startDateISO))
    .slice(0, count);
}
