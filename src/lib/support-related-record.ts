// Resolves a real record (booking/group-class/payout/counselling) from the
// id passed through the support link into the rich summary shown at the top
// of the support form and conversation — never re-derives/guesses fields,
// falls back to just the label if the record can't be found (e.g. an old
// link to a since-cancelled record).
import { getPrivateLessons } from "@/lib/private-lessons-store";
import { getGroupClassEnrollments } from "@/lib/group-class-enrollment-store";
import { getLiveGroupClassBySlug } from "@/lib/group-classes-live-data";
import { getPayoutRequests } from "@/lib/payout-store";
import { initialCounsellingAppointments, formatCounsellingDisplayId } from "@/lib/admin-counselling-data";
import type { RelatedRecordType } from "@/lib/support-data";
import type { RelatedRecordSummary } from "@/components/support/support-request-form";

export function resolveRelatedRecord(
  type: RelatedRecordType | null,
  id: string | null,
  fallbackLabel: string | null
): RelatedRecordSummary | undefined {
  if (!type || !id) return undefined;

  if (type === "booking") {
    const lesson = getPrivateLessons().find((l) => l.id === id || l.bookingReference === id);
    if (lesson) {
      return {
        type,
        id,
        label: `${lesson.subject} · ${lesson.bookingReference}`,
        lines: [
          { label: "Booking ID", value: lesson.bookingReference },
          { label: "Subject", value: lesson.subject },
          { label: "Date", value: `${lesson.date} · ${lesson.time}` },
        ],
      };
    }
  }

  if (type === "group-class") {
    const enrollment = getGroupClassEnrollments().find((e) => e.id === id);
    const listing = enrollment ? getLiveGroupClassBySlug(enrollment.slug) : undefined;
    if (enrollment && listing) {
      return {
        type,
        id,
        label: listing.title,
        lines: [
          { label: "Class ID", value: enrollment.id },
          { label: "Tutor", value: listing.tutorName },
          { label: "Schedule", value: `${listing.days}, ${listing.time}` },
        ],
      };
    }
  }

  if (type === "payout") {
    const payout = getPayoutRequests().find((p) => p.id === id);
    if (payout) {
      return {
        type,
        id,
        label: `Payout ${payout.id}`,
        lines: [
          { label: "Payout ID", value: payout.id },
          { label: "Amount", value: `₦${payout.amount.toLocaleString()}` },
          { label: "Status", value: payout.status },
        ],
      };
    }
  }

  if (type === "counselling") {
    const appointment = initialCounsellingAppointments.find((a) => a.id === id);
    if (appointment) {
      return {
        type,
        id,
        label: `Counselling session ${formatCounsellingDisplayId(appointment.id)}`,
        lines: [
          { label: "Session ID", value: formatCounsellingDisplayId(appointment.id) },
          { label: "Date", value: `${appointment.dateLabel} · ${appointment.time}` },
          { label: "Status", value: appointment.status },
        ],
      };
    }
  }

  // Fall back to whatever label was passed through the link, with no
  // detailed lines, rather than dropping the context entirely.
  if (fallbackLabel) {
    return { type, id, label: fallbackLabel, lines: [] };
  }
  return undefined;
}
