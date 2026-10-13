// Admin -> Reports & Issues. Distinct from Disputes (escrow-release.ts):
// Disputes are booking/payment/lesson problems that can affect money and are
// tied to a real lesson confirmation; Reports are broader platform
// moderation/support issues (conduct, messages, technical problems) that may
// or may not ever touch money. A report can lead to a dispute, but they are
// never the same record.
//
// Resolving a report answers "how was the reporter's actual problem
// resolved" (see report-resolution-taxonomy.ts for the dynamic, per-category
// resolution options). Whether any action was taken against an account is a
// SEPARATE decision (`ReportResolution.accountAction`) — a report can be
// fully resolved (e.g. a refund issued) with zero account action, or have an
// account action with no service resolution needed. These must never be
// treated as the same field.
import { formatBookingDisplayId, initialBookings } from "@/lib/admin-bookings-data";
import type { AccountActionType } from "@/lib/report-resolution-taxonomy";

// "Community Post"/"Community Comment" are prepared for the future
// Community feature (feature-flags.ts) — reusing this same Reports system
// rather than a separate Community-only moderation queue, per that
// feature's own design. No report of these types can exist yet since
// Community has no live entry point to file one from.
// The report-detail page (admin-report-review-client.tsx) never branches
// routing on this value — every type opens through the exact same
// /admin/reports/[reportId] route and shared component; `type` only ever
// decides what contextual info that one page renders. Adding a new type
// here is always safe for that reason.
export type ReportType = "Tutor" | "Student" | "Group Class" | "Booking" | "Lesson Quality" | "Conduct" | "Message" | "Payment" | "Technical Issue" | "Other" | "Community Post" | "Community Comment";
export type ReportStatus = "Open" | "Under Review" | "Awaiting Information" | "Escalated" | "Resolved" | "Dismissed";
export type ReportPriority = "High" | "Medium" | "Low";

export interface ReportTimelineEntry {
  label: string;
  atLabel: string;
}

export interface ReportResolution {
  // Answers "how was the reporter's problem resolved" — one of the dynamic
  // per-category options from report-resolution-taxonomy.ts.
  outcome: string;
  note: string;
  // Only populated when the resolution involves money.
  originalAmount?: number;
  refundAmount?: number;
  remainingAmount?: number;
  refundMethod?: string;
  refundReference?: string;
  // Answers the SEPARATE question "was any action taken against an
  // account" — independent of the outcome above.
  accountAction: AccountActionType;
  accountActionTarget?: "Tutor" | "Student";
  notifyStudent: boolean;
  notifyTutor: boolean;
  studentMessage?: string;
  tutorMessage?: string;
  resolvedBy: string;
  resolvedAtLabel: string;
}

export interface ReportEscalation {
  destination: string;
  note: string;
  escalatedBy: string;
  escalatedAtLabel: string;
}

export interface Report {
  id: string;
  // Set only on a report migrated from the old rep-<timestamp>-<random> id
  // scheme to a real RPT reference code (see migrateLegacyReportId in
  // reports-store.ts) — keeps any already-stored cross-reference to the old
  // id (e.g. a ModerationViolation.reportId minted before the migration)
  // resolving correctly, without rewriting that other record.
  legacyId?: string;
  type: ReportType;
  reportedName: string;
  reportedRole?: string;
  reportedImage?: string;
  reportedUserId?: string; // real admin-data.ts AdminTutor/AdminStudent id, when applicable
  reporterName: string;
  reporterRole: "Student" | "Tutor" | "Admin";
  reason: string;
  description: string;
  status: ReportStatus;
  priority: ReportPriority;
  submittedLabel: string;
  bookingId?: string; // real BookingRow id — never fabricated
  communityPostId?: string; // real CommunityPost id, when type is a Community report
  communityCommentId?: string; // real CommunityComment id, when reporting a specific comment
  timeline: ReportTimelineEntry[];
  resolution?: ReportResolution;
  escalation?: ReportEscalation;
}

// "Community Post"/"Community Comment" are deliberately excluded from this
// filter list while the Community feature is disabled (feature-flags.ts) —
// they're valid ReportType values so a future Community report is never
// misrouted, but showing them here would surface the disabled feature.
export const reportTypes: ReportType[] = ["Tutor", "Student", "Group Class", "Booking", "Lesson Quality", "Conduct", "Message", "Payment", "Technical Issue", "Other"];

export const reportStatusStyles: Record<ReportStatus, string> = {
  Open: "bg-rose-100 text-rose-700",
  "Under Review": "bg-amber-100 text-amber-700",
  "Awaiting Information": "bg-blue-100 text-blue-700",
  Escalated: "bg-violet-100 text-violet-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  Dismissed: "bg-ensena-bg-soft text-ensena-muted",
};

export const reportPriorityStyles: Record<ReportPriority, string> = {
  High: "bg-rose-100 text-rose-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-ensena-bg-soft text-ensena-muted",
};

function imageFor(name: string): string | undefined {
  return initialBookings.find((b) => b.tutor === name)?.tutorImage ?? initialBookings.find((b) => b.student === name)?.studentImage;
}

export const initialReports: Report[] = [
  {
    id: "RPTB2CNHDC",
    type: "Tutor",
    reportedName: "Tunde Adebayo",
    reportedRole: "Mathematics Tutor",
    reportedImage: imageFor("Tunde Adebayo"),
    reportedUserId: "t-5",
    reporterName: "Cynthia Ejie",
    reporterRole: "Student",
    reason: "Tutor conduct",
    description: "The tutor was rude during our last lesson and used inappropriate language when I asked a question.",
    status: "Open",
    priority: "High",
    submittedLabel: "Aug 28, 2026 · 3:40 PM",
    bookingId: "BK-10294",
    timeline: [{ label: "Report submitted", atLabel: "Aug 28, 2026 · 3:40 PM" }],
  },
  {
    id: "RPTC2CNHDC",
    type: "Group Class",
    reportedName: "French Conversation for Beginners",
    reportedRole: "Group Class",
    reporterName: "David Okonkwo",
    reporterRole: "Student",
    reason: "Class not as described",
    description: "The class description said beginner level but the tutor is teaching intermediate content most students can't follow.",
    status: "Under Review",
    priority: "Medium",
    submittedLabel: "Aug 27, 2026 · 11:20 AM",
    timeline: [
      { label: "Report submitted", atLabel: "Aug 27, 2026 · 11:20 AM" },
      { label: "Admin opened case", atLabel: "Aug 27, 2026 · 2:05 PM" },
    ],
  },
  {
    id: "RPTD2CNHDC",
    type: "Message",
    reportedName: "Faruk Musa",
    reportedRole: "Mathematics Tutor",
    reportedImage: imageFor("Faruk Musa"),
    reportedUserId: "t-7",
    reporterName: "Hannah Bassey",
    reporterRole: "Student",
    reason: "Inappropriate message",
    description: "Received a message outside of lesson hours that made me uncomfortable. Screenshot attached to the original report.",
    status: "Open",
    priority: "High",
    submittedLabel: "Aug 28, 2026 · 9:05 AM",
    timeline: [{ label: "Report submitted", atLabel: "Aug 28, 2026 · 9:05 AM" }],
  },
  {
    id: "RPTE2CNHDC",
    type: "Booking",
    reportedName: formatBookingDisplayId("BK-10289"),
    reportedRole: "Private Lesson Booking",
    reporterName: "Chidera Nwosu",
    reporterRole: "Student",
    reason: "Refund not received",
    description: "My lesson was cancelled by the tutor two weeks ago and I still haven't received my refund.",
    status: "Under Review",
    priority: "Medium",
    submittedLabel: "Aug 27, 2026 · 4:15 PM",
    bookingId: "BK-10289",
    timeline: [
      { label: "Report submitted", atLabel: "Aug 27, 2026 · 4:15 PM" },
      { label: "Admin opened case", atLabel: "Aug 28, 2026 · 9:10 AM" },
    ],
  },
  {
    id: "RPTF2CNHDC",
    type: "Student",
    reportedName: "Grace Emmanuel",
    reportedRole: "Student",
    reportedImage: imageFor("Grace Emmanuel"),
    reportedUserId: "s-4",
    reporterName: "Adaeze Okonkwo",
    reporterRole: "Tutor",
    reason: "Repeated no-shows",
    description: "Student has missed three scheduled lessons in a row without any notice or message.",
    status: "Resolved",
    priority: "Low",
    submittedLabel: "Aug 22, 2026 · 10:00 AM",
    timeline: [
      { label: "Report submitted", atLabel: "Aug 22, 2026 · 10:00 AM" },
      { label: "Admin opened case", atLabel: "Aug 22, 2026 · 4:30 PM" },
      { label: "Case resolved: Attendance record corrected", atLabel: "Aug 23, 2026 · 9:15 AM" },
    ],
    resolution: {
      outcome: "Attendance record corrected",
      note: "Confirmed repeated no-shows with the tutor across three consecutive lessons. Booking restricted until a deposit policy is agreed with the student.",
      accountAction: "Temporary restriction",
      accountActionTarget: "Student",
      notifyStudent: true,
      notifyTutor: true,
      studentMessage: "Your report has been reviewed. Because of repeated missed lessons, a temporary booking restriction has been applied to your account until this is resolved.",
      tutorMessage: "Thanks for reporting this. We've confirmed the pattern and applied a temporary restriction to the student's account.",
      resolvedBy: "Admin",
      resolvedAtLabel: "Aug 23, 2026 · 9:15 AM",
    },
  },
  {
    id: "RPTG2CNHDC",
    type: "Payment",
    reportedName: "Zainab Yusuf",
    reportedRole: "Biology Tutor",
    reportedImage: imageFor("Zainab Yusuf"),
    reportedUserId: "t-6",
    reporterName: "Cynthia Ejie",
    reporterRole: "Student",
    reason: "Duplicate charge",
    description: "I was charged twice for the same lesson booking this week.",
    status: "Open",
    priority: "Medium",
    submittedLabel: "Aug 28, 2026 · 1:10 PM",
    timeline: [{ label: "Report submitted", atLabel: "Aug 28, 2026 · 1:10 PM" }],
  },
  {
    id: "RPTH2CNHDC",
    type: "Technical Issue",
    reportedName: "Virtual Classroom",
    reportedRole: "Platform Feature",
    reporterName: "Peter Obi",
    reporterRole: "Student",
    reason: "App crashed during lesson",
    description: "The classroom whiteboard froze twice during my lesson and I had to refresh the page each time.",
    status: "Dismissed",
    priority: "Low",
    submittedLabel: "Aug 21, 2026 · 5:00 PM",
    timeline: [
      { label: "Report submitted", atLabel: "Aug 21, 2026 · 5:00 PM" },
      { label: "Case dismissed", atLabel: "Aug 21, 2026 · 6:30 PM" },
    ],
    resolution: {
      outcome: "Technical incident logged",
      note: "Not a moderation issue. Logged for the engineering backlog. No account action needed.",
      accountAction: "No account action",
      notifyStudent: false,
      notifyTutor: false,
      resolvedBy: "Admin",
      resolvedAtLabel: "Aug 21, 2026 · 6:30 PM",
    },
  },
  {
    id: "RPTJ2CNHDC",
    type: "Tutor",
    reportedName: "Ibrahim Suleiman",
    reportedRole: "Biology Tutor",
    reportedImage: imageFor("Ibrahim Suleiman"),
    reportedUserId: "t-8",
    reporterName: "David Okonkwo",
    reporterRole: "Student",
    reason: "Missed scheduled lessons",
    description: "Tutor did not show up for two consecutive scheduled lessons with no message or reschedule request.",
    status: "Resolved",
    priority: "High",
    submittedLabel: "Aug 20, 2026 · 8:00 AM",
    timeline: [
      { label: "Report submitted", atLabel: "Aug 20, 2026 · 8:00 AM" },
      { label: "Admin opened case", atLabel: "Aug 20, 2026 · 10:30 AM" },
      { label: "Case resolved: Full refund issued", atLabel: "Aug 20, 2026 · 2:00 PM" },
    ],
    resolution: {
      outcome: "Full refund issued",
      note: "Confirmed a pattern of missed lessons across multiple students. Student refunded in full; tutor account suspended pending review.",
      originalAmount: 12000,
      refundAmount: 12000,
      remainingAmount: 0,
      refundMethod: "Original payment method",
      accountAction: "Suspension",
      accountActionTarget: "Tutor",
      notifyStudent: true,
      notifyTutor: true,
      studentMessage: "Your report has been reviewed. You've been refunded in full for the missed lessons.",
      tutorMessage: "Your account has been suspended pending review due to a confirmed pattern of missed lessons.",
      resolvedBy: "Admin",
      resolvedAtLabel: "Aug 20, 2026 · 2:00 PM",
    },
  },
  {
    id: "RPTK2CNHDC",
    type: "Group Class",
    reportedName: "WAEC Revision Bootcamp",
    reportedRole: "Group Class",
    reporterName: "Amaka N.",
    reporterRole: "Student",
    reason: "Poor lesson quality",
    description: "Tutor spent most of the session on a topic unrelated to the class syllabus.",
    status: "Open",
    priority: "Low",
    submittedLabel: "Aug 26, 2026 · 6:50 PM",
    timeline: [{ label: "Report submitted", atLabel: "Aug 26, 2026 · 6:50 PM" }],
  },
];

// Reports don't need a separate "display id" derived from an internal id
// (the way formatBookingDisplayId/formatCounsellingDisplayId hash a seed's
// plain id for display elsewhere): a Report's own `id` field IS the real
// RPT-prefixed reference code directly, for both the seed data above
// (hardcoded to the exact codes buildBookingReference used to derive from
// their old "rep-N" ids, so nothing an admin has already seen changes) and
// runtime-created reports (see reports-store.ts's createReport, which
// mints one via reference-code-store.ts). This is also what fixed the
// "Review sometimes 404s" bug: the id shown on screen and the id used to
// look the report up were previously two different values with no lookup
// between them.
