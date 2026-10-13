// Real, persisted Support Requests — localStorage-backed, same idiom as
// payout-store.ts. Seeded with a realistic historical roster (below) so the
// Admin Support Inbox looks and behaves like a live support desk from the
// first load, exactly matching the "legacy + real merge" pattern used
// elsewhere in this app (admin-group-classes-client.tsx, etc.) — seed rows
// stay visible forever, and any of them touched by an admin (reply/assign/
// status/priority) gets materialized into real storage without losing its
// history, since every store function below reads through the merged view.
import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import { sendBookingEmail } from "@/lib/email-service";
import type {
  RelatedRecordType,
  SupportAttachment,
  SupportContext,
  SupportMessage,
  SupportPriority,
  SupportRequest,
  SupportSource,
  SupportStatus,
  SupportUserRole,
} from "@/lib/support-data";

const SUPPORT_KEY = "ensena_support_requests";
export const SUPPORT_REQUESTS_EVENT = "ensena:support-requests-changed";

function makeCachedReader<T>(key: string, seed: T) {
  let cachedRaw: string | null = null;
  let cachedParsed: T = seed;
  return (): T => {
    if (typeof window === "undefined") return seed;
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = raw ? (JSON.parse(raw) as T) : seed;
    }
    return cachedParsed;
  };
}

// Backfills fields added to the SupportRequest shape after some real
// requests may already have been submitted and persisted (source, subject,
// activity) — without this, an older browser's saved localStorage entry
// would be missing them entirely and crash the Inbox/Detail pages that
// render those fields unconditionally.
function normalize(r: SupportRequest): SupportRequest {
  return {
    ...r,
    source: r.source ?? "Ticket",
    subject: r.subject ?? r.category,
    activity: r.activity ?? [],
  };
}

const EMPTY: SupportRequest[] = [];
const readRawStored = makeCachedReader<SupportRequest[]>(SUPPORT_KEY, EMPTY);

// Caches the normalized array on the underlying stored reference (itself
// already stable per makeCachedReader) so repeated calls between actual
// writes return the identical array instance — same stability requirement
// as getMerged() below.
let cachedStoredRaw: SupportRequest[] | null = null;
let cachedNormalized: SupportRequest[] = EMPTY;
function readRaw(): SupportRequest[] {
  const stored = readRawStored();
  if (stored !== cachedStoredRaw) {
    cachedStoredRaw = stored;
    cachedNormalized = stored.map(normalize);
  }
  return cachedNormalized;
}

function writeJson(value: SupportRequest[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SUPPORT_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(SUPPORT_REQUESTS_EVENT));
}

function activityEntry(actorName: string, action: string, atISO: string = new Date().toISOString()): { id: string; actorName: string; action: string; atISO: string } {
  return { id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, actorName, action, atISO };
}

// Demo historical requests — never edited in place; any staff action on one
// of these materializes an updated copy into real storage (see
// updateRequest), so the seed array itself stays a stable, replayable base.
const SEED_SUPPORT_REQUESTS: SupportRequest[] = [
  {
    id: "SUP3Q7NB", subject: "Can't withdraw earnings", userName: "Michael Adewale", userEmail: "michael.a@example.com", userRole: "Tutor", context: "payout", category: "Payments & Earnings",
    subcategory: "Withdrawal Issue", source: "Email", message: "I'm unable to withdraw my earnings. I've completed several lessons but the withdrawal option isn't working.",
    status: "Open", priority: "High", createdAtISO: "2026-08-31T15:04:00.000Z", updatedAtISO: "2026-08-31T15:04:00.000Z",
    conversation: [
      { id: "SUP3Q7NB-1", author: "user", authorName: "Michael Adewale", text: "I'm unable to withdraw my earnings. I've completed several lessons but the withdrawal option isn't working.\n\nPlease check and let me know.\n\nThank you.", atISO: "2026-08-31T15:04:00.000Z", attachments: [{ name: "withdrawal-error.png", size: "120 KB", dataUrl: "" }] },
      { id: "SUP3Q7NB-2", author: "staff", authorName: "Sarah Johnson", text: "Hi Michael,\n\nThanks for contacting us. I'm sorry you're experiencing this issue.\n\nI'll check your account and transaction details and get back to you shortly.\n\nBest regards,\nSarah", atISO: "2026-08-31T16:09:00.000Z" },
      { id: "SUP3Q7NB-3", author: "user", authorName: "Michael Adewale", text: "Okay, thank you. Please let me know if you need any other information.", atISO: "2026-08-31T16:29:00.000Z" },
    ],
    activity: [
      activityEntry("Michael Adewale", "Request created via Email", "2026-08-31T15:04:00.000Z"),
      activityEntry("Sarah Johnson", "Sarah Johnson sent a reply", "2026-08-31T16:09:00.000Z"),
      activityEntry("Michael Adewale", "Requester replied", "2026-08-31T16:29:00.000Z"),
    ],
  },
  {
    id: "SUP3N9KD", subject: "Payment charged twice for one lesson", userName: "Amina Bello", userEmail: "amina.bello@example.com", userRole: "Student", context: "payment", category: "Payments & Refunds",
    subcategory: "Duplicate Charge", source: "Live Chat", message: "I was charged twice for one lesson with my tutor. Can this be reversed?",
    status: "In Progress", priority: "High", assignedStaff: "Sarah Johnson",
    createdAtISO: "2026-08-31T15:10:00.000Z", updatedAtISO: "2026-08-31T16:15:00.000Z",
    conversation: [
      { id: "SUP3N9KD-1", author: "user", authorName: "Amina Bello", text: "I was charged twice for one lesson with my tutor. Can this be reversed?", atISO: "2026-08-31T15:10:00.000Z" },
    ],
    activity: [
      activityEntry("Amina Bello", "Request created via Live Chat", "2026-08-31T15:10:00.000Z"),
      activityEntry("Cynthia Ejie", "Assigned to Sarah Johnson", "2026-08-31T15:50:00.000Z"),
      activityEntry("Cynthia Ejie", "Status changed from Open to In Progress", "2026-08-31T16:15:00.000Z"),
    ],
  },
  {
    id: "SUP2M4PL", subject: "Tutor profile not visible to students", userName: "Ibrahim Suleiman", userEmail: "ibrahim.s@example.com", userRole: "Tutor", context: "account", category: "Profile & Visibility",
    subcategory: "Search Visibility", source: "Report", message: "My tutor profile doesn't appear when students search for my subject.",
    status: "Open", priority: "Normal", assignedStaff: "Zainab Aliyu",
    createdAtISO: "2026-08-31T14:00:00.000Z", updatedAtISO: "2026-08-31T14:20:00.000Z",
    conversation: [{ id: "SUP2M4PL-1", author: "user", authorName: "Ibrahim Suleiman", text: "My tutor profile doesn't appear when students search for my subject.", atISO: "2026-08-31T14:00:00.000Z" }],
    activity: [
      activityEntry("Ibrahim Suleiman", "Request created via Report", "2026-08-31T14:00:00.000Z"),
      activityEntry("Cynthia Ejie", "Assigned to Zainab Aliyu", "2026-08-31T14:20:00.000Z"),
    ],
  },
  {
    id: "SUP8G2HY", subject: "How do I change my subject preferences?", userName: "Chidinma Eze", userEmail: "chidinma.eze@example.com", userRole: "Student", context: "account", category: "Account",
    subcategory: "Preferences", source: "Email", message: "How do I change my subject preferences on my account?",
    status: "Waiting for User", priority: "Low", assignedStaff: "Uche Nnamdi",
    createdAtISO: "2026-08-31T13:15:00.000Z", updatedAtISO: "2026-08-31T13:40:00.000Z",
    conversation: [
      { id: "SUP8G2HY-1", author: "user", authorName: "Chidinma Eze", text: "How do I change my subject preferences on my account?", atISO: "2026-08-31T13:15:00.000Z" },
      { id: "SUP8G2HY-2", author: "staff", authorName: "Uche Nnamdi", text: "Hi Chidinma, could you tell me which subjects you'd like added or removed?", atISO: "2026-08-31T13:40:00.000Z" },
    ],
    activity: [
      activityEntry("Chidinma Eze", "Request created via Email", "2026-08-31T13:15:00.000Z"),
      activityEntry("Cynthia Ejie", "Assigned to Uche Nnamdi", "2026-08-31T13:25:00.000Z"),
      activityEntry("Uche Nnamdi", "Uche Nnamdi sent a reply", "2026-08-31T13:40:00.000Z"),
      activityEntry("Uche Nnamdi", "Status changed from Open to Waiting for User", "2026-08-31T13:41:00.000Z"),
    ],
  },
  {
    id: "SUP7K5RQ", subject: "Live class keeps disconnecting", userName: "Daniel Peter", userEmail: "daniel.peter@example.com", userRole: "Student", context: "technical", category: "Technical Issues",
    subcategory: "Classroom", source: "Live Chat", message: "My live class keeps disconnecting every few minutes.",
    status: "In Progress", priority: "High", assignedStaff: "Uche Nnamdi",
    createdAtISO: "2026-08-31T12:00:00.000Z", updatedAtISO: "2026-08-31T12:40:00.000Z",
    conversation: [{ id: "SUP7K5RQ-1", author: "user", authorName: "Daniel Peter", text: "My live class keeps disconnecting every few minutes.", atISO: "2026-08-31T12:00:00.000Z" }],
    activity: [
      activityEntry("Daniel Peter", "Request created via Live Chat", "2026-08-31T12:00:00.000Z"),
      activityEntry("Cynthia Ejie", "Assigned to Uche Nnamdi", "2026-08-31T12:20:00.000Z"),
      activityEntry("Uche Nnamdi", "Status changed from Open to In Progress", "2026-08-31T12:40:00.000Z"),
    ],
  },
  {
    id: "SUP6F1VB", subject: "Incorrect refund amount", userName: "Amaka Obi", userEmail: "amaka.obi@example.com", userRole: "Student", context: "payment", category: "Payments & Refunds",
    subcategory: "Refund Amount", source: "Report", message: "The refund I received for a cancelled lesson looks incorrect. It's less than what I paid.",
    status: "Open", priority: "Normal", createdAtISO: "2026-08-31T10:30:00.000Z", updatedAtISO: "2026-08-31T10:30:00.000Z",
    conversation: [{ id: "SUP6F1VB-1", author: "user", authorName: "Amaka Obi", text: "The refund I received for a cancelled lesson looks incorrect. It's less than what I paid.", atISO: "2026-08-31T10:30:00.000Z" }],
    activity: [activityEntry("Amaka Obi", "Request created via Report", "2026-08-31T10:30:00.000Z")],
  },
  {
    id: "SUP5X9MN", subject: "Verification documents rejected", userName: "Chinedu Okeke", userEmail: "chinedu.okeke@example.com", userRole: "Tutor", context: "account", category: "Tutor Verification",
    subcategory: "Documents", source: "Email", message: "My verification documents were rejected. Can you tell me why?",
    status: "Resolved", priority: "High", assignedStaff: "Sarah Johnson",
    createdAtISO: "2026-08-30T18:15:00.000Z", updatedAtISO: "2026-08-30T18:15:00.000Z",
    conversation: [
      { id: "SUP5X9MN-1", author: "user", authorName: "Chinedu Okeke", text: "My verification documents were rejected. Can you tell me why?", atISO: "2026-08-30T14:00:00.000Z" },
      { id: "SUP5X9MN-2", author: "staff", authorName: "Sarah Johnson", text: "Hi Chinedu, your ID photo was blurry. Please re-upload a clearer copy under Profile → Verification & Documents.", atISO: "2026-08-30T18:15:00.000Z" },
    ],
    activity: [
      activityEntry("Chinedu Okeke", "Request created via Email", "2026-08-30T14:00:00.000Z"),
      activityEntry("Cynthia Ejie", "Assigned to Sarah Johnson", "2026-08-30T14:30:00.000Z"),
      activityEntry("Sarah Johnson", "Sarah Johnson sent a reply", "2026-08-30T18:15:00.000Z"),
      activityEntry("Sarah Johnson", "Status changed from Open to Resolved", "2026-08-30T18:16:00.000Z"),
    ],
  },
  {
    id: "SUP4D3TR", subject: "Unable to book a lesson", userName: "Favour Uche", userEmail: "favour.uche@example.com", userRole: "Student", context: "booking", category: "Bookings & Lessons",
    subcategory: "Booking Failure", source: "Live Chat", message: "I keep getting an error when trying to book a lesson.",
    status: "Closed", priority: "Low", assignedStaff: "Uche Nnamdi",
    createdAtISO: "2026-08-29T16:05:00.000Z", updatedAtISO: "2026-08-29T17:00:00.000Z",
    conversation: [
      { id: "SUP4D3TR-1", author: "user", authorName: "Favour Uche", text: "I keep getting an error when trying to book a lesson.", atISO: "2026-08-29T16:05:00.000Z" },
      { id: "SUP4D3TR-2", author: "staff", authorName: "Uche Nnamdi", text: "This was a temporary payment gateway issue and has been fixed. Please try again.", atISO: "2026-08-29T17:00:00.000Z" },
    ],
    activity: [
      activityEntry("Favour Uche", "Request created via Live Chat", "2026-08-29T16:05:00.000Z"),
      activityEntry("Uche Nnamdi", "Status changed from Open to Resolved", "2026-08-29T17:00:00.000Z"),
      activityEntry("Uche Nnamdi", "Status changed from Resolved to Closed", "2026-08-29T17:05:00.000Z"),
    ],
  },
  {
    id: "SUP9H2LK", subject: "Payout stuck in pending", userName: "Ngozi Umeh", userEmail: "ngozi.umeh@example.com", userRole: "Tutor", context: "payout", category: "Payments & Earnings",
    subcategory: "Payout Pending", source: "Ticket", message: "My payout has been pending for over a week now.",
    status: "Open", priority: "Urgent", createdAtISO: "2026-08-31T09:20:00.000Z", updatedAtISO: "2026-08-31T09:20:00.000Z",
    conversation: [{ id: "SUP9H2LK-1", author: "user", authorName: "Ngozi Umeh", text: "My payout has been pending for over a week now.", atISO: "2026-08-31T09:20:00.000Z" }],
    activity: [activityEntry("Ngozi Umeh", "Request created via Ticket", "2026-08-31T09:20:00.000Z")],
  },
  {
    id: "SUP1PQZX", subject: "Can't reset my password", userName: "Blessing Okoro", userEmail: "blessing.okoro@example.com", userRole: "Student", context: "account", category: "Account",
    subcategory: "Login Issue", source: "Ticket", message: "I can't reset my password. The reset email never arrives.",
    status: "Resolved", priority: "Normal", assignedStaff: "Zainab Aliyu",
    createdAtISO: "2026-08-28T11:00:00.000Z", updatedAtISO: "2026-08-28T13:00:00.000Z",
    conversation: [
      { id: "SUP1PQZX-1", author: "user", authorName: "Blessing Okoro", text: "I can't reset my password. The reset email never arrives.", atISO: "2026-08-28T11:00:00.000Z" },
      { id: "SUP1PQZX-2", author: "staff", authorName: "Zainab Aliyu", text: "This should be fixed now. Please check your spam folder too.", atISO: "2026-08-28T13:00:00.000Z" },
    ],
    activity: [
      activityEntry("Blessing Okoro", "Request created via Ticket", "2026-08-28T11:00:00.000Z"),
      activityEntry("Cynthia Ejie", "Assigned to Zainab Aliyu", "2026-08-28T11:30:00.000Z"),
      activityEntry("Zainab Aliyu", "Status changed from Open to Resolved", "2026-08-28T13:00:00.000Z"),
    ],
  },
  {
    id: "SUP0LM7T", subject: "Group class enrollment not showing", userName: "Yusuf Aliyu", userEmail: "yusuf.aliyu@example.com", userRole: "Student", context: "group-class", category: "Group Classes",
    subcategory: "Enrollment", source: "Report", message: "I paid for a group class but it isn't showing in My Classes.",
    status: "Closed", priority: "Normal", assignedStaff: "Sarah Johnson",
    createdAtISO: "2026-08-27T09:00:00.000Z", updatedAtISO: "2026-08-27T15:00:00.000Z",
    conversation: [
      { id: "SUP0LM7T-1", author: "user", authorName: "Yusuf Aliyu", text: "I paid for a group class but it isn't showing in My Classes.", atISO: "2026-08-27T09:00:00.000Z" },
      { id: "SUP0LM7T-2", author: "staff", authorName: "Sarah Johnson", text: "This has been fixed and your enrollment is now visible. Sorry for the inconvenience.", atISO: "2026-08-27T15:00:00.000Z" },
    ],
    activity: [
      activityEntry("Yusuf Aliyu", "Request created via Report", "2026-08-27T09:00:00.000Z"),
      activityEntry("Sarah Johnson", "Status changed from Open to Resolved", "2026-08-27T15:00:00.000Z"),
      activityEntry("Sarah Johnson", "Status changed from Resolved to Closed", "2026-08-27T15:05:00.000Z"),
    ],
  },
  {
    id: "SUPADM01", subject: "Payment gateway showing errors intermittently", userName: "Cynthia Ejie", userEmail: "admin@ensena.co", userRole: "Admin", context: "platform-staff", category: "System / technical issue",
    subcategory: "Payments", source: "Ticket", message: "The payment gateway is showing intermittent errors on checkout. Needs engineering attention.",
    status: "In Progress", priority: "Urgent", assignedStaff: "Cynthia Ejie",
    createdAtISO: "2026-08-31T16:40:00.000Z", updatedAtISO: "2026-08-31T16:45:00.000Z",
    conversation: [{ id: "SUPADM01-1", author: "user", authorName: "Cynthia Ejie", text: "The payment gateway is showing intermittent errors on checkout. Needs engineering attention.", atISO: "2026-08-31T16:40:00.000Z" }],
    activity: [
      activityEntry("Cynthia Ejie", "Request created via Ticket", "2026-08-31T16:40:00.000Z"),
      activityEntry("Cynthia Ejie", "Assigned to Cynthia Ejie", "2026-08-31T16:42:00.000Z"),
      activityEntry("Cynthia Ejie", "Status changed from Open to In Progress", "2026-08-31T16:45:00.000Z"),
    ],
  },
];

// Cached on the real array's own (already-stable) reference so repeated
// calls between actual writes return the identical merged array instance —
// required for useSyncExternalStore (see use-support-requests.ts): a fresh
// array on every call, even with identical contents, causes React to think
// the store changed on every render and re-render in a loop.
let cachedReal: SupportRequest[] | null = null;
let cachedMerged: SupportRequest[] = SEED_SUPPORT_REQUESTS;

function getMerged(): SupportRequest[] {
  const real = readRaw();
  if (real !== cachedReal) {
    cachedReal = real;
    const overridden = new Set(real.map((r) => r.id));
    cachedMerged = [...SEED_SUPPORT_REQUESTS.filter((r) => !overridden.has(r.id)), ...real];
  }
  return cachedMerged;
}

export function getSupportRequests(): SupportRequest[] {
  return getMerged();
}

export function getSupportRequestsForUser(userName: string): SupportRequest[] {
  return getMerged().filter((r) => r.userName === userName);
}

export function getSupportRequest(id: string): SupportRequest | undefined {
  return getMerged().find((r) => r.id === id);
}

// A seed request has no entry in real storage until a staff action touches
// it — this materializes it there (with the patch applied) instead of
// silently dropping the mutation, so seed rows are just as editable as
// freshly-submitted ones.
function updateRequest(id: string, patch: Partial<SupportRequest>): void {
  const real = readRaw();
  const current = real.find((r) => r.id === id) ?? SEED_SUPPORT_REQUESTS.find((r) => r.id === id);
  if (!current) return;
  const updated: SupportRequest = { ...current, ...patch, updatedAtISO: new Date().toISOString() };
  const next = real.some((r) => r.id === id) ? real.map((r) => (r.id === id ? updated : r)) : [...real, updated];
  writeJson(next);
}

export async function submitSupportRequest(input: {
  userName: string;
  userEmail?: string;
  userPhone?: string;
  userRole: SupportUserRole;
  isExistingUser?: boolean;
  context: SupportContext;
  category: string;
  subcategory?: string;
  subject?: string;
  message: string;
  source?: SupportSource;
  channel?: SupportRequest["channel"];
  filedByStaffName?: string;
  priority?: SupportPriority;
  assignedStaff?: string;
  relatedRecordType?: RelatedRecordType;
  relatedRecordId?: string;
  relatedRecordLabel?: string;
  attachments?: SupportAttachment[];
}): Promise<SupportRequest> {
  const exists = (candidate: string) => getMerged().some((r) => r.id === candidate);
  const id = await generateUniqueReferenceCode("support", exists);
  const nowISO = new Date().toISOString();
  const source = input.source ?? "Ticket";
  // A manually-filed ticket's first "message" is the staff member recording
  // what the caller said, so its author is genuinely the requester (who
  // said it), not the staff member (who only wrote it down) — filedByStaffName
  // is what distinguishes the two in Activity, not the conversation itself.
  const createdVia =
    source === "Manual" && input.channel ? `${input.channel} (filed by ${input.filedByStaffName ?? "Support"})` : `Request created via ${source}`;
  // The ticket form doesn't collect a separate subject line — the category
  // (already specific, e.g. "Withdrawal problem") stands in as the short
  // title shown in the Admin Support Inbox and detail header.
  const created: SupportRequest = {
    ...input,
    id,
    source,
    subject: input.subject ?? input.category,
    status: "Open",
    priority: input.priority ?? "Normal",
    createdAtISO: nowISO,
    updatedAtISO: nowISO,
    conversation: [
      { id: `${id}-1`, author: "user", authorName: input.userName, text: input.message, atISO: nowISO, attachments: input.attachments },
    ],
    activity: [
      activityEntry(input.filedByStaffName ?? input.userName, source === "Manual" ? `Ticket filed manually: ${createdVia}` : createdVia),
      ...(input.assignedStaff ? [activityEntry(input.filedByStaffName ?? input.userName, `Assigned to ${input.assignedStaff}`)] : []),
    ],
  };
  writeJson([...readRaw(), created]);
  // Only send a confirmation when we actually have somewhere to send it —
  // a Manual ticket filed for a caller support couldn't find an email for
  // stays silent here rather than emailing a guessed/placeholder address.
  if (input.userEmail) {
    sendBookingEmail({
      to: input.userEmail,
      template: "support_ticket_created",
      bookingId: id,
      vars: { recipientName: input.userName, subject: created.subject, bookingReference: id },
    });
  }
  return created;
}

export function addSupportReply(
  id: string,
  author: "user" | "staff",
  authorName: string,
  text: string,
  options?: { isInternal?: boolean; attachments?: SupportAttachment[] }
): void {
  const request = getMerged().find((r) => r.id === id);
  if (!request) return;
  const message: SupportMessage = {
    id: `${id}-${request.conversation.length + 1}`,
    author,
    authorName,
    text,
    atISO: new Date().toISOString(),
    isInternal: options?.isInternal,
    attachments: options?.attachments,
  };
  const nextStatus: SupportStatus =
    author === "staff" && !options?.isInternal && request.status === "Open" ? "In Progress"
      : author === "user" && request.status === "Waiting for User" ? "In Progress"
        : request.status;
  const activityLabel = options?.isInternal ? `${authorName} added an internal note` : author === "staff" ? `${authorName} sent a reply` : "Requester replied";
  updateRequest(id, {
    conversation: [...request.conversation, message],
    status: nextStatus,
    activity: [...request.activity, activityEntry(authorName, activityLabel)],
  });

  // Only a real staff reply the requester can actually see is worth an
  // email — an internal note was never meant for them, and a requester's
  // own reply doesn't need to be emailed back to themselves.
  if (author === "staff" && !options?.isInternal && request.userEmail) {
    sendBookingEmail({
      to: request.userEmail,
      template: "support_ticket_replied",
      bookingId: id,
      vars: { recipientName: request.userName, otherPartyName: authorName, subject: request.subject, bookingReference: id, messageBody: text },
    });
  }
}

export function updateSupportStatus(id: string, status: SupportStatus, actorName: string): void {
  const request = getMerged().find((r) => r.id === id);
  if (!request || request.status === status) return;
  updateRequest(id, { status, activity: [...request.activity, activityEntry(actorName, `Status changed from ${request.status} to ${status}`)] });
  if (status === "Resolved" && request.userEmail) {
    sendBookingEmail({
      to: request.userEmail,
      template: "support_ticket_resolved",
      bookingId: id,
      vars: { recipientName: request.userName, subject: request.subject, bookingReference: id },
    });
  }
}

export function updateSupportPriority(id: string, priority: SupportPriority, actorName: string): void {
  const request = getMerged().find((r) => r.id === id);
  if (!request || request.priority === priority) return;
  updateRequest(id, { priority, activity: [...request.activity, activityEntry(actorName, `Priority changed from ${request.priority} to ${priority}`)] });
}

export function assignSupportRequest(id: string, staffName: string, actorName: string): void {
  const request = getMerged().find((r) => r.id === id);
  if (!request) return;
  const action = staffName ? `Assigned to ${staffName}` : "Unassigned";
  updateRequest(id, { assignedStaff: staffName || undefined, activity: [...request.activity, activityEntry(actorName, action)] });
}

export function subscribeSupportRequests(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SUPPORT_REQUESTS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SUPPORT_REQUESTS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
