// Admin -> Communications. Templates are static reference content; actual
// sent/scheduled messages live in admin-communications-store.ts (shared,
// localStorage-backed, same idiom as escrow-store.ts/admin-audit-log.ts) so
// a message sent from User Directory's "Contact" action and one sent from a
// bulk Compose campaign both land in the same Sent log.
export type MessageChannel = "Email" | "In-App" | "SMS";

export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "Transactional" | "Marketing";
}

export const initialTemplates: MessageTemplate[] = [
  { id: "tpl-tutor-verified", name: "Tutor Verification Approved", category: "Transactional", subject: "You're verified on Ensena!", body: "Your Ensena tutor account has been verified. You can now accept bookings and start teaching." },
  { id: "tpl-tutor-resubmit", name: "Tutor Verification Resubmission", category: "Transactional", subject: "Action needed: update your verification documents", body: "Please update your verification documents so we can complete your review." },
  { id: "tpl-group-class-approved", name: "Group Class Approved", category: "Transactional", subject: "Your group class has been approved", body: "Your group class has been approved and is now live for students to enroll." },
  { id: "tpl-booking-reminder", name: "Booking Reminder", category: "Transactional", subject: "Your lesson starts soon", body: "Your upcoming Ensena lesson starts soon. Make sure you're ready to join." },
  { id: "tpl-payout-processed", name: "Payout Processed", category: "Transactional", subject: "Your payout has been processed", body: "Your tutor payout has been processed and sent to your registered bank account." },
  { id: "tpl-account-restricted", name: "Account Restricted", category: "Transactional", subject: "Your account has been restricted", body: "Your account has been restricted. Please contact support for more information." },
];

export type AudienceType = "All Students" | "All Tutors" | "By State" | "By Status" | "Selected Users";
