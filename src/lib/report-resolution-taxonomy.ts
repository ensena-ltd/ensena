// Enseña is an academic support platform, not a social-media moderation
// board — most reports are ordinary service issues (refunds, scheduling,
// attendance, lesson quality), not policy violations. The old resolve
// modal offered one fixed list of moderation outcomes (Warning issued /
// Content removed / Account restricted / suspended / banned / No
// violation found) for every report, regardless of what was actually
// reported. This module drives a resolution list that matches the report
// instead, and keeps "how was the student's/tutor's problem resolved"
// completely separate from "was any account action taken" — two different
// admin decisions that must never collapse into one field.
import type { Report, ReportType } from "@/lib/admin-reports-data";

export type ReportCategory =
  | "Refund"
  | "Booking"
  | "Attendance"
  | "LessonQuality"
  | "Communication"
  | "Technical"
  | "GroupClass"
  | "TutorPerformance"
  | "Safety"
  | "General";

export const reportCategoryLabels: Record<ReportCategory, string> = {
  Refund: "Refund / Payment",
  Booking: "Booking / Scheduling",
  Attendance: "Attendance",
  LessonQuality: "Lesson Quality",
  Communication: "Communication",
  Technical: "Technical Problem",
  GroupClass: "Group Class",
  TutorPerformance: "Tutor Performance Pattern",
  Safety: "Safety / Policy Concern",
  General: "General Issue",
};

// Order matters — more specific/serious categories are checked first so a
// report that mentions both "repeated" and "inappropriate contact" is
// treated as a Safety concern, not just a performance pattern.
const categoryKeywords: [ReportCategory, RegExp][] = [
  [
    "Safety",
    /harass|threat|abuse|assault|exploit|extortion|scam|fraud|contact information|personal information|off[- ]?platform|privacy|impersonat|inappropriate/i,
  ],
  ["Communication", /message|messaging|contact|communication|unresponsive|not responding/i],
  ["Refund", /refund|charged|payment (failed|declined|pending)|duplicate charge|payout/i],
  ["Attendance", /did not attend|didn.?t (show|attend)|no.?show|late|left early|ended early/i],
  ["LessonQuality", /quality|unprepared|poor lesson|teaching|methodology|not as described/i],
  ["TutorPerformance", /repeated|multiple (reports|reviews|complaints)|pattern/i],
  ["Technical", /technical|video|audio|camera|screen shar|link (broken|didn.?t work)|crash|froze/i],
  ["GroupClass", /group class/i],
  ["Booking", /booking|cancel|reschedul|schedul/i],
];

export function inferReportCategory(report: Pick<Report, "type" | "reason" | "description">): ReportCategory {
  const haystack = `${report.type} ${report.reason} ${report.description}`;
  for (const [category, pattern] of categoryKeywords) {
    if (pattern.test(haystack)) return category;
  }
  if (report.type === "Group Class") return "GroupClass";
  return "General";
}

// The dynamic "Resolution" list shown in the resolve modal — this is the
// answer to "how was the reporter's actual problem resolved", never an
// account-level punishment (that lives in accountActionOptions instead).
export const resolutionOptionsByCategory: Record<ReportCategory, string[]> = {
  Refund: [
    "Refund issued",
    "Partial refund issued",
    "Refund already processing",
    "Refund delayed: payment provider processing",
    "Booking credit issued",
    "Refund not approved",
    "No refund required",
    "Other",
  ],
  Booking: [
    "Booking updated",
    "Booking rescheduled",
    "Booking cancelled: full refund",
    "Booking cancelled: partial refund",
    "Replacement tutor offered",
    "Booking credit issued",
    "No action required",
    "Other",
  ],
  Attendance: [
    "Full refund issued",
    "Partial refund issued",
    "Rescheduled lesson",
    "Booking credit issued",
    "Attendance record corrected",
    "No compensation required",
    "Other",
  ],
  LessonQuality: [
    "Refund approved",
    "Partial refund approved",
    "Replacement tutor offered",
    "Replacement lesson arranged",
    "Student advised to continue with tutor",
    "Issue recorded for tutor performance review",
    "No violation found",
    "Other",
  ],
  Communication: [
    "Message reviewed",
    "Message/content removed",
    "Student advised",
    "Tutor advised",
    "Issue escalated for further review",
    "No violation found",
    "Other",
  ],
  Technical: [
    "Technical guidance provided",
    "Lesson rescheduled",
    "Replacement lesson offered",
    "Credit issued",
    "Partial refund issued",
    "Full refund issued",
    "Technical incident logged",
    "Other",
  ],
  GroupClass: [
    "Rescheduled",
    "Transferred to another class",
    "Replacement session offered",
    "Full refund issued",
    "Partial refund issued",
    "Class credit issued",
    "No action required",
    "Other",
  ],
  TutorPerformance: [
    "Feedback sent to tutor",
    "Performance warning issued",
    "Tutor improvement plan",
    "Temporary booking restriction",
    "No action required",
    "Other",
  ],
  Safety: ["Message/content reviewed", "Issue investigated", "Student/tutor advised", "No violation found", "Other"],
  General: ["Issue resolved", "No action required", "Other"],
};

// A resolution's first entry doubles as the "recommended resolution"
// shown at the top of the modal — a deterministic hint, not a real AI
// suggestion, and never auto-applied.
export function recommendedResolution(category: ReportCategory): string {
  return resolutionOptionsByCategory[category][0];
}

export function resolutionNeedsRefundDetails(outcome: string): boolean {
  return /refund|credit/i.test(outcome);
}

// The Account Action section is always available (an admin can flag any
// report), but only auto-expanded where it's actually the likely next
// question — everywhere else it stays collapsed under "No account action".
export function categoryEmphasizesAccountAction(category: ReportCategory): boolean {
  return category === "Communication" || category === "Safety" || category === "TutorPerformance";
}

export const accountActionOptions = ["No account action", "Warning", "Temporary restriction", "Suspension", "Account removal"] as const;
export type AccountActionType = (typeof accountActionOptions)[number];

export const escalationDestinations = [
  "Payment/Refund review",
  "Tutor performance review",
  "Trust & Safety review",
  "Technical support",
  "Senior admin review",
] as const;

// Who an account action would most plausibly target, based on who was
// reported — the admin can always override this in the UI.
export function defaultAccountActionTarget(type: ReportType): "Tutor" | "Student" | undefined {
  if (type === "Tutor") return "Tutor";
  if (type === "Student") return "Student";
  return undefined;
}
