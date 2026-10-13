// Adapts a real LessonConfirmation (escrow-store.ts) into the BookingRow
// shape the admin Payments & Earnings page already renders — so a real
// session a student/tutor actually completed shows up in Total Revenue,
// the Transactions table, and the Payment Details page, instead of only
// ever showing the static seed bookings in admin-bookings-data.ts. Only
// fields LessonConfirmation genuinely has are populated; everything else
// (timeline, homework, aiSummary, ...) is left empty/absent rather than
// invented, since BookingRow already declares those fields optional.
import type { LessonConfirmation } from "@/lib/escrow-release";
import type { BookingRow, BookingStatus, PaymentEscrowStatus } from "@/lib/admin-bookings-data";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";
import { getTutorBySlug, slugify } from "@/lib/tutors";

function statusFor(l: LessonConfirmation): BookingStatus {
  if (l.confirmationStatus === "Disputed") return "Disputed";
  return "Completed"; // a LessonConfirmation only ever exists once the session already happened
}

function paymentStatusFor(l: LessonConfirmation): PaymentEscrowStatus {
  if (l.resolution?.outcome === "Refund") return "Refunded";
  if (l.escrowStatus === "Released") return "Released";
  return "Held in Escrow"; // Held or Frozen — either way, not released yet
}

function imageForName(name: string): string {
  if (name === dashboardStudent.name) return dashboardStudent.image;
  if (name === dashboardTutor.name) return dashboardTutor.image;
  return getTutorBySlug(slugify(name))?.image ?? "/teacher-1.jpg.png";
}

export function lessonConfirmationToBookingRow(l: LessonConfirmation): BookingRow {
  const completedDate = new Date(l.completedAt);
  return {
    id: l.id,
    type: l.type === "Group" ? "Group Class" : "Private Lesson",
    bookingReference: l.referenceCode ?? l.id,
    student: l.student,
    studentImage: imageForName(l.student),
    studentEmail: "",
    studentPhone: "",
    tutor: l.tutor,
    tutorImage: imageForName(l.tutor),
    tutorEmail: "",
    tutorPhone: "",
    subject: l.subject,
    academicLevel: "",
    topic: "",
    date: completedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: completedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    durationMins: l.attendance?.classDurationMinutes ?? l.scheduledDurationMinutes ?? 60,
    mode: "Online",
    status: statusFor(l),
    paymentStatus: paymentStatusFor(l),
    amountGross: l.amountGross,
    createdAt: completedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " · " + completedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    refundStatus: l.resolution?.outcome === "Refund" || l.resolution?.outcome === "Partial" ? "Refunded" : undefined,
    timeline: [],
    groupClassId: l.groupClassId,
    sessionId: l.sessionId,
    completedAtMs: l.completedAt,
    scheduledDurationMinutes: l.attendance?.classDurationMinutes,
  };
}
