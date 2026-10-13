// One shared Support Request system used everywhere "Contact Support"
// appears — the categories/labels shown change per context, but every
// submission becomes the same real, connected SupportRequest record (see
// support-store.ts). Kept deliberately separate from Disputes
// (escrow-release.ts), Reports (admin-reports-data.ts) and Counselling
// (admin-counselling-data.ts) — those are different systems for different
// purposes, not alternate views of this one.
export type SupportContext =
  | "public"
  | "tutor-signup"
  | "student"
  | "tutor"
  | "booking"
  | "group-class"
  | "payment"
  | "payout"
  | "counselling"
  | "account"
  | "technical"
  | "platform-staff";

// The one support inbox address shown across Help Centers and emails.
export const SUPPORT_EMAIL = "support@ensena.co";

export type SupportStatus = "Open" | "In Progress" | "Waiting for User" | "Resolved" | "Closed";
export type SupportPriority = "Low" | "Normal" | "High" | "Urgent";
export type RelatedRecordType = "booking" | "group-class" | "payout" | "counselling" | "restriction";
// "Admin" covers every admin/support-staff AdminRole (Customer Support,
// Finance, Counsellor, etc.) — the specific role already lives on the
// platform-user account; this field only needs to distinguish which of the
// four audiences (Guest/Student/Tutor/Admin) filed the request.
export type SupportUserRole = "Guest" | "Student" | "Tutor" | "Admin";

// Contexts a logged-out visitor can legitimately land in — used by both the
// public Help Center and the public ticket form to validate/clamp an
// untrusted `?context=` query param to the same safe set.
export const GUEST_CONTEXTS: SupportContext[] = ["public", "tutor-signup", "account", "payment", "booking", "technical"];

// Where the request came in from. "Ticket", "Report", and now "Manual" (a
// staff member filing on a caller's behalf — see admin-support-new-client.tsx)
// are actually creatable in this app today — there's no email inbox or live
// chat backend to ingest from. "Email" and "Live Chat" still exist as real
// enum values so the Source badge/filter works correctly for seeded
// historical requests and won't need a shape change whenever those channels
// are wired up for real.
export type SupportSource = "Ticket" | "Report" | "Email" | "Live Chat" | "Manual";

// How the complaint actually reached staff, distinct from `source` (HOW the
// ticket record was created) — a phone call filed as source "Manual" has
// channel "Phone". Free-form on purpose (Phone/WhatsApp/In Person/Email/
// Other) rather than a closed enum, since support may take calls through
// channels this app has no other integration with.
export type SupportChannel = "Phone" | "WhatsApp" | "In Person" | "Email" | "Other";

export interface SupportAttachment {
  name: string;
  size: string;
  dataUrl: string;
}

// How an attachment is stored in the database (support_messages.attachments).
export interface StoredAttachment {
  name: string;
  size: number;
  mimeType: string;
  path: string;
}

export interface SupportMessage {
  id: string;
  author: "user" | "staff";
  authorName: string;
  text: string;
  atISO: string;
  // Internal notes are staff-only — never rendered to the requester. See
  // SupportConversation's isStaff filter and the admin detail page.
  isInternal?: boolean;
  attachments?: SupportAttachment[];
}

export interface SupportActivityEntry {
  id: string;
  actorName: string;
  action: string;
  atISO: string;
}

export interface SupportRequest {
  id: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  userRole: SupportUserRole;
  // True only when the requester is a real, existing Enseña account
  // (matched via search at creation time) — false for a manually-filed
  // ticket about someone support couldn't find an account for (e.g. a
  // prospective student who called before ever signing up). Absent on
  // every non-manual ticket, where the requester IS the authenticated user
  // submitting it, so this is never in question.
  isExistingUser?: boolean;
  context: SupportContext;
  category: string;
  subcategory?: string;
  source: SupportSource;
  // Only meaningful alongside source "Manual" — see SupportChannel's doc
  // comment for how this differs from `source`.
  channel?: SupportChannel;
  // The staff member who actually typed this ticket in — only set for a
  // Manual ticket; absent when the requester submitted it themselves.
  filedByStaffName?: string;
  subject: string;
  message: string;
  status: SupportStatus;
  priority: SupportPriority;
  createdAtISO: string;
  updatedAtISO: string;
  relatedRecordType?: RelatedRecordType;
  relatedRecordId?: string;
  relatedRecordLabel?: string;
  assignedStaff?: string;
  conversation: SupportMessage[];
  activity: SupportActivityEntry[];
}

export interface SupportContextConfig {
  title: string;
  subtitle: string;
  categories: string[];
}

// Human-readable label for the highlight banner shown when a Help Center is
// opened with a specific context (see NeedHelpCard's "Browse Help Center"
// link and HelpCenterClient's highlightContext prop) — only the contexts
// that actually originate from a specific record/page need an entry here.
export const SUPPORT_CONTEXT_LABELS: Partial<Record<SupportContext, string>> = {
  booking: "your booking",
  "group-class": "this class",
  payment: "this payment",
  payout: "your payout",
  counselling: "counselling",
  account: "your account",
  "tutor-signup": "your tutor application",
  technical: "technical problems",
};

// Category lists match the approved spec's per-surface lists exactly —
// this is the one place that decides what a given context sees, so a new
// context is a data change here, not a new form component.
export const SUPPORT_CONTEXT_CONFIG: Record<SupportContext, SupportContextConfig> = {
  public: {
    title: "How can we help?",
    subtitle: "We're here to help you with Ensena.",
    categories: [
      "Finding a tutor",
      "Group classes",
      "Booking a lesson",
      "Academic counselling",
      "Creating an account",
      "Payment",
      "Technical problem",
      "Something else",
    ],
  },
  "tutor-signup": {
    title: "Need help with your tutor application?",
    subtitle: "We're here to help you complete your Ensena profile.",
    categories: [
      "Creating my account",
      "Email verification",
      "Profile photo",
      "Completing my tutor profile",
      "Academic levels or subjects",
      "Teaching format",
      "Teaching location",
      "Verification documents",
      "Something else",
    ],
  },
  student: {
    title: "How can we help?",
    subtitle: "Let us know what you need help with.",
    categories: [
      "Bookings & Lessons",
      "Tutors",
      "Group Classes",
      "Payments & Refunds",
      "Counselling",
      "Account",
      "Technical Support",
      "Other",
    ],
  },
  tutor: {
    title: "How can we help?",
    subtitle: "Let us know what you need help with.",
    categories: [
      "Bookings & Students",
      "Group Classes",
      "Availability & Calendar",
      "Tutor Verification",
      "Payments & Earnings",
      "Payouts",
      "Account & Profile",
      "Technical Support",
      "Other",
    ],
  },
  booking: {
    title: "Help with this booking",
    subtitle: "What went wrong?",
    categories: [
      "Tutor hasn't joined",
      "I need to reschedule",
      "I need to cancel",
      "Problem with the lesson",
      "Payment problem",
      "Something else",
    ],
  },
  "group-class": {
    title: "Help with this class",
    subtitle: "What do you need help with?",
    categories: [
      "Class schedule",
      "Joining the class",
      "Enrollment",
      "Attendance",
      "Tutor/class issue",
      "Payment",
      "Technical problem",
      "Something else",
    ],
  },
  payment: {
    title: "Help with this payment",
    subtitle: "What's the issue with this transaction?",
    categories: ["Charged incorrectly", "Refund request", "Payment failed", "Receipt / invoice", "Something else"],
  },
  payout: {
    title: "Help with this payout",
    subtitle: "What's the issue with this payout?",
    categories: ["Payout pending", "Withdrawal problem", "Payout failed", "Earnings incorrect", "Other"],
  },
  counselling: {
    title: "Help with counselling",
    subtitle: "What do you need help with?",
    categories: [
      "Book a counselling session",
      "Reschedule",
      "Join my session",
      "Technical problem",
      "Follow-up",
      "Something else",
    ],
  },
  account: {
    title: "Help with your account",
    subtitle: "What's the issue?",
    categories: ["Login issues", "Update profile information", "Change password", "Delete account", "Appeal a messaging restriction or suspension", "Something else"],
  },
  technical: {
    title: "Report a technical problem",
    subtitle: "What went wrong?",
    categories: ["App not loading", "Video/audio issues", "Error on a page", "Something else"],
  },
  "platform-staff": {
    title: "Internal support",
    subtitle: "For Ensena admins and platform staff. This is a real escalation, not student/tutor support.",
    categories: [
      "Users",
      "Bookings",
      "Payments",
      "Payouts",
      "Disputes",
      "Counselling",
      "Reports",
      "Platform management",
      "Staff accounts & permissions",
      "Notifications",
      "System / technical issue",
      "Other",
    ],
  },
};
