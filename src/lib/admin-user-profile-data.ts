// Per-user detail helpers for the Admin → View User page
// (admin-user-profile-client.tsx). platformUsers itself is already
// synthesized aggregate data (see mockActivity/mockLoginHistory in
// admin-users-data.ts) — these follow the same established convention:
// small, plausible, deterministic per-user record lists derived from a
// user's own real aggregate counts, using buildBookingReference (the
// codebase's sanctioned "no real booking backend yet" stand-in generator)
// for every id shown, rather than inventing ad hoc identifiers.
import { buildBookingReference } from "@/lib/booking-reference";
import { initialAdminStudents } from "@/lib/admin-data";
import { groupClassListings } from "@/lib/group-classes-data";
import type { PlatformUser } from "@/lib/admin-users-data";
import { tutorListings, type TutorListing } from "@/lib/tutors";

export function marketplaceProfileFor(name: string): TutorListing | undefined {
  return tutorListings.find((t) => t.name === name);
}

// A TUTxxxxxxxx-style display id, deterministically derived from the
// tutor's own real internal id (e.g. "t-5") via the platform's shared
// reference-code system — never a newly generated/random identifier, same
// spirit as buildBookingReference below. Replaces a previous sequential
// "ENS-TUT-000005" format, which exposed a predictable, guessable id.
export function formatTutorId(rawId: string): string {
  return buildBookingReference("tutor", rawId);
}

// Same idea for a platform user who isn't a tutor (student, counsellor,
// admin, etc.) — resolves to STDxxxxxxxx for a student, USRxxxxxxxx for
// anything else. PlatformUser.id is itself an internal composite key
// ("usr-s-3"), never shown to anyone; this is the reference code shown in
// its place.
export function formatPlatformUserId(user: PlatformUser): string {
  const rawId = user.id.replace(/^usr-/, "");
  return buildBookingReference(user.role === "Student" ? "student" : "user", rawId);
}

// Cross-references a tutor's assigned-student name back to the real admin
// student record so "click a student" can open the existing Admin Student
// Profile (/admin/users/usr-{id}) instead of a dead link.
export function adminStudentIdByName(name: string): string | undefined {
  return initialAdminStudents.find((s) => s.name === name)?.id;
}

export interface BookingRow {
  id: string;
  title: string;
  counterpart: string;
  type: "Private" | "Group";
  date: string;
  amount: number;
  status: "Upcoming" | "Completed";
}

const bookingDateOffsets = [-2, -6, 3, 8]; // a mix of past + upcoming, most-recent-ish first

export function bookingsFor(user: PlatformUser): BookingRow[] {
  const count = Math.min(user.totalBookings || 0, 4);
  if (count === 0) return [];
  const subject = user.academicLevel?.split(" · ")[0] || user.academicLevel || "General";
  const rows: BookingRow[] = [];
  for (let i = 0; i < count; i++) {
    const offsetDays = bookingDateOffsets[i % bookingDateOffsets.length];
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const isGroup = i % 3 === 1;
    rows.push({
      id: buildBookingReference(isGroup ? "group" : "private", `${user.id}-bk-${i}`),
      title: isGroup ? `${subject} Group Class` : subject,
      counterpart: isGroup ? "Group Class" : "Private Lesson",
      type: isGroup ? "Group" : "Private",
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: isGroup ? 2000 : 5000,
      status: offsetDays < 0 ? "Completed" : "Upcoming",
    });
  }
  return rows;
}

export interface CounsellingSession {
  date: string;
  type: "Video Call" | "Phone Call" | "Message";
  status: "Upcoming" | "Completed";
}

export function counsellingSessionsFor(user: PlatformUser): CounsellingSession[] {
  const count = Math.min(Math.round((user.totalBookings || 0) / 6), 3);
  const sessions: CounsellingSession[] = [];
  for (let i = 0; i < count; i++) {
    const offset = i === 0 ? 1 : -7 * i;
    const date = new Date();
    date.setDate(date.getDate() + offset);
    sessions.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
      type: i % 2 === 0 ? "Video Call" : "Message",
      status: offset > 0 ? "Upcoming" : "Completed",
    });
  }
  return sessions;
}

export interface TutorClassGroup {
  slug: string;
  title: string;
  gradeLevel: string;
  students: number;
  maxSeats: number;
  price: number;
}

export function groupClassesFor(tutorName: string): TutorClassGroup[] {
  return groupClassListings
    .filter((g) => g.tutorName === tutorName)
    .map((g) => ({ slug: g.slug, title: g.title, gradeLevel: g.gradeLevel, students: g.enrolled, maxSeats: g.maxSeats, price: g.price }));
}

export interface VerificationDocument {
  label: string;
  status: "Uploaded" | "Missing";
}

export function verificationDocumentsFor(): VerificationDocument[] {
  return [
    { label: "Government ID", status: "Uploaded" },
    { label: "Academic Certificate", status: "Uploaded" },
    { label: "Teaching Qualification", status: "Uploaded" },
    { label: "Other Supporting Document", status: "Missing" },
  ];
}
