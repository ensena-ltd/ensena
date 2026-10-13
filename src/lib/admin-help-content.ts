// Admin/platform-staff Help Center content — same FaqItem shape as the
// tutor/student Help Centers (tutor-dashboard-data.ts), rendered through
// the shared HelpCenterClient (src/components/support/help-center-client.tsx)
// rather than a separate hand-built page. Each item's `tags` doubles as the
// admin-permissions section key(s) it belongs to (Users, Payments, etc. —
// see admin-permissions-data.ts's allSections) so AdminHelpCenterClient can
// only show a staff member questions about areas they can actually access.
import type { FaqItem } from "@/lib/tutor-dashboard-data";

export const adminFaqItems: FaqItem[] = [
  { question: "How do I approve or reject a tutor's verification documents?", answer: "Go to Tutor Verification, open the application, review each document and approve, reject or request resubmission.", tags: ["TutorVerification"] },
  { question: "How do I suspend or ban a user?", answer: "Open the user's profile from Users, then use Restrict Account or Ban Account depending on severity. Both are logged to the audit log.", tags: ["Users"] },
  { question: "How do I review a group class before it goes live?", answer: "Go to Group Classes → pending submissions, open the class and approve, reject or request changes.", tags: ["GroupClasses"] },
  { question: "How do I resolve a payment dispute?", answer: "Go to Disputes, open the case, review the evidence and activity log, then release, refund or partially refund from the case's own actions.", tags: ["Disputes"] },
  { question: "How does a payout get approved?", answer: "Go to Payments → Payouts, open the request and approve or reject it. Approving moves it to Processing.", tags: ["Payments", "payout"] },
  { question: "How do I handle a booking issue for a student or tutor?", answer: "Open the booking from Bookings to view its full details, send a payment reminder, or cancel it if needed.", tags: ["Bookings"] },
  { question: "How do I manage a counsellor's availability or a student's session?", answer: "Go to Counselling to view appointments, manage counsellor availability, and open a specific student's intake and history.", tags: ["Counselling"] },
  { question: "How do support requests get assigned?", answer: "Open the request in Support and use the Assigned To field. Only staff with the Support permission appear as assignable.", tags: ["Support"] },
  { question: "How do I moderate a review?", answer: "Go to Reviews to keep, remove, or add an internal note to a review.", tags: ["Reviews"] },
  { question: "Where do I see platform-wide performance and trends?", answer: "Go to Analytics for bookings, revenue, retention and growth metrics across the platform.", tags: ["Analytics"] },
  { question: "How do I manage subjects, academic levels or exams?", answer: "Go to Platform Management to add, edit or retire subjects, academic levels, exams and group class categories.", tags: ["PlatformManagement"] },
  { question: "How do I change what a platform-staff account can access?", answer: "Go to Settings → Platform Users, open the account, and adjust its role or custom section/permission overrides.", tags: ["Settings"] },
];

// Article content itself now lives in help-articles-data.ts (audience:
// "Admin") so it goes through the same content system as every other Help
// Center — see AdminHelpCenterClient, which reads it through
// usePublishedHelpArticles("Admin") instead of a hardcoded list.
