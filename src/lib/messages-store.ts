// Real, persisted student<->tutor messaging — localStorage-backed, same
// idiom as every other store this session. Previously both messaging
// clients (student-messages-client.tsx, tutor-dashboard's messages-client
// .tsx) held their message list in local `useState` seeded from a fixed
// array — nothing survived reload, and neither side's "sent" messages were
// visible to the other (two entirely disconnected seed arrays, a
// pre-existing gap this store also fixes as a side effect).
//
// More importantly, `sendStudentMessage`/`sendTutorMessage` are the SINGLE
// choke point every outgoing, free-typed message passes through — which is
// what lets the Communication Safety engine (communication-safety.ts) and
// the Violation/Restriction engine (moderation-store.ts) actually be
// enforced rather than merely suggested by a UI component. No other code
// path writes a plain-text message into this store. Offer objects (a
// tutor's structured price/duration proposal) go through the separate
// append/update functions below and skip the safety check for their
// STRUCTURED fields (price, date, time — not prose, nothing to scan) — but
// an Offer's free-text fields (message/discountRequestMessage/a counter's
// note) are exactly as much a prose channel as a plain message, so every UI
// that lets someone type one of those calls checkOfferTextAllowed() below
// before sending, through the same analyzeCommunication/recordViolation
// choke point rather than a second, disconnected check.
import { analyzeCommunication, BLOCKED_MESSAGE_COPY } from "@/lib/communication-safety";
import type { MessageAttachment } from "@/lib/message-attachment-types";
import { buildRestrictionMessage, isRestricted, recordViolation } from "@/lib/moderation-store";
import { pushStudentNotification } from "@/lib/notifications-store";
import { effectiveStatus, type Offer } from "@/lib/offers-data";
import { initialMessages, type ChatMessage } from "@/lib/tutor-dashboard-data";
import { initialStudentMessages, type StudentChatMessage } from "@/lib/student-dashboard-data";
import { pushTutorNotification } from "@/lib/tutor-notifications-store";

const STUDENT_KEY = "ensena_student_messages";
const TUTOR_KEY = "ensena_tutor_messages";
export const MESSAGES_EVENT = "ensena:messages-changed";

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

const readStudentRaw = makeCachedReader<StudentChatMessage[]>(STUDENT_KEY, initialStudentMessages);
const readTutorRaw = makeCachedReader<ChatMessage[]>(TUTOR_KEY, initialMessages);

function writeStudent(value: StudentChatMessage[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STUDENT_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(MESSAGES_EVENT));
}

function writeTutor(value: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TUTOR_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(MESSAGES_EVENT));
}

export function getStudentMessages(): StudentChatMessage[] {
  return readStudentRaw();
}

export function getTutorMessages(): ChatMessage[] {
  return readTutorRaw();
}

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "blocked"; userMessage: string }
  | { ok: false; reason: "restricted"; userMessage: string };

// How many of the sender's own recent messages in this conversation get
// combined with the new one before re-analyzing — catches "cynthiaaj" /
// "at gmail" / "dot com" sent as three separate, individually-harmless
// messages, and a phone number spelled out one digit/word per message
// ("zero" / "eight" / "zero" / ...). Only the sender's OWN prior messages
// are ever included (never the other party's), and only the NEW message is
// blocked if the combination trips something the standalone text didn't —
// the earlier messages already went out and aren't retroactively unsent.
// 10 (not 4) so a full 11-digit Nigerian number split one token per message
// is still inside the window by the time the last digit arrives.
const CONTEXT_WINDOW_SIZE = 10;

function checkSendAllowed(
  senderName: string,
  actorRole: "Student" | "Tutor",
  text: string,
  channel: "Message",
  recentOwnTexts: string[]
): SendResult | null {
  if (isRestricted(senderName, actorRole, "messaging")) {
    return {
      ok: false,
      reason: "restricted",
      userMessage: buildRestrictionMessage(senderName, actorRole),
    };
  }

  const standalone = analyzeCommunication(text);
  if (standalone.verdict === "block" && standalone.primary) {
    recordViolation(senderName, actorRole, standalone.primary.category, standalone.primary.confidence, channel, { evidence: text });
    return { ok: false, reason: "blocked", userMessage: BLOCKED_MESSAGE_COPY };
  }

  // The message looks fine on its own — check whether it's the piece that
  // completes something split across recent messages. Combined-context
  // detections are never auto-confirmed as a strike (too heuristic to be
  // certain) — they're blocked and flagged for admin review instead.
  if (recentOwnTexts.length > 0) {
    const combined = analyzeCommunication([...recentOwnTexts, text].join(" "));
    if (combined.verdict === "block" && combined.primary) {
      recordViolation(senderName, actorRole, combined.primary.category, "medium", channel, {
        evidence: [...recentOwnTexts, text].join(" | "),
        fromContextWindow: true,
      });
      return { ok: false, reason: "blocked", userMessage: BLOCKED_MESSAGE_COPY };
    }
  }

  return null;
}

function recentOwnTexts(messages: { convId: string; sender: string; text?: string }[], convId: string, senderTag: string): string[] {
  return messages
    .filter((m) => m.convId === convId && m.sender === senderTag && m.text)
    .slice(-CONTEXT_WINDOW_SIZE)
    .map((m) => m.text as string);
}

// The Offer-side equivalent of checkSendAllowed — every free-text field a
// person can type onto a proposal (the initial note, a discount-request
// message, a counter-offer's note) goes through the exact same
// analyzeCommunication/recordViolation choke point as a plain message,
// rather than a proposal being a second, unscanned channel to slip contact
// information through. Structured fields (price, date, time) are never
// passed here — they aren't prose, there's nothing to scan.
export function checkOfferTextAllowed(texts: (string | undefined)[], senderName: string, actorRole: "Student" | "Tutor"): SendResult | null {
  if (isRestricted(senderName, actorRole, "messaging")) {
    return {
      ok: false,
      reason: "restricted",
      userMessage: buildRestrictionMessage(senderName, actorRole),
    };
  }
  for (const text of texts) {
    if (!text || !text.trim()) continue;
    const analysis = analyzeCommunication(text);
    if (analysis.verdict === "block" && analysis.primary) {
      recordViolation(senderName, actorRole, analysis.primary.category, analysis.primary.confidence, "Message", { evidence: text });
      return { ok: false, reason: "blocked", userMessage: BLOCKED_MESSAGE_COPY };
    }
  }
  return null;
}

function messagePreview(text: string, attachments?: MessageAttachment[]): string {
  const trimmed = text.trim();
  if (trimmed) return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
  if (attachments && attachments.length > 0) return `Sent ${attachments.length > 1 ? `${attachments.length} attachments` : "an attachment"}`;
  return "";
}

export interface SendMessageOptions {
  /** A random id generated once per send *attempt* by the caller (not per message) — a double-tap on Send, or a retry after a slow/failed response, reuses the same clientId, so the store can recognize it as the same attempt rather than a new message. */
  clientId?: string;
  attachments?: MessageAttachment[];
}

// Sending a message writes to the SENDER's own array (as before) but also
// mirrors a matching entry into the OTHER side's array — without this, a
// tutor's reply only ever existed in `ensena_tutor_messages`, invisible to
// `getStudentMessages()`/the student's own inbox no matter what. The two
// stores stay distinct types (see the plan's "parallel, not unified" call),
// but a real conversation now genuinely has both parties able to see the
// same messages, which no amount of attachment/emoji/proposal work matters
// without. Both copies share the same `id`, so any code that needs to find
// "this exact message on the other side" (e.g. an offer status update) can.

// The only way a new free-typed student message is ever added.
export function sendStudentMessage(convId: string, senderName: string, text: string, options: SendMessageOptions = {}): SendResult {
  if (options.clientId) {
    const dupe = readStudentRaw().some((m) => m.convId === convId && m.clientId === options.clientId);
    if (dupe) return { ok: true };
  }
  const denied = checkSendAllowed(senderName, "Student", text, "Message", recentOwnTexts(readStudentRaw(), convId, "student"));
  if (denied) return denied;
  const id = `sm-${Date.now()}`;
  const message: StudentChatMessage = {
    id,
    convId,
    sender: "student",
    text,
    time: "Just now",
    read: true,
    clientId: options.clientId,
    attachments: options.attachments,
  };
  writeStudent([...readStudentRaw(), message]);
  const mirrored: ChatMessage = { id, convId, sender: "student", text, time: "Just now", read: false, attachments: options.attachments };
  writeTutor([...readTutorRaw(), mirrored]);
  pushTutorNotification({ category: "Message", text: `${senderName} sent you a message: "${messagePreview(text, options.attachments)}"` });
  return { ok: true };
}

// The only way a new free-typed tutor message is ever added.
export function sendTutorMessage(convId: string, senderName: string, text: string, options: SendMessageOptions = {}): SendResult {
  if (options.clientId) {
    const dupe = readTutorRaw().some((m) => m.convId === convId && m.clientId === options.clientId);
    if (dupe) return { ok: true };
  }
  const denied = checkSendAllowed(senderName, "Tutor", text, "Message", recentOwnTexts(readTutorRaw(), convId, "tutor"));
  if (denied) return denied;
  const sharedId = `m-${Date.now()}`;
  const mirroredToStudent: StudentChatMessage = { id: sharedId, convId, sender: "other", text, time: "Just now", read: false, attachments: options.attachments };
  writeStudent([...readStudentRaw(), mirroredToStudent]);
  const message: ChatMessage = {
    id: sharedId,
    convId,
    sender: "tutor",
    text,
    time: "Just now",
    read: false,
    clientId: options.clientId,
    attachments: options.attachments,
  };
  writeTutor([...readTutorRaw(), message]);
  pushStudentNotification({ category: "Message", text: `${senderName} sent you a message: "${messagePreview(text, options.attachments)}"` });
  return { ok: true };
}

// Called once when a conversation is actually opened — never on a bare
// Messages-page mount, and never for the viewer's own messages (only the
// other party's are ever "unread" to begin with). Persisted, so unread
// state survives reload instead of living only in the list-page's local
// state (the previous behavior).
export function markStudentConversationRead(convId: string): void {
  writeStudent(readStudentRaw().map((m) => (m.convId === convId && m.sender !== "student" ? { ...m, read: true } : m)));
}

export function markTutorConversationRead(convId: string): void {
  writeTutor(readTutorRaw().map((m) => (m.convId === convId && m.sender !== "tutor" ? { ...m, read: true } : m)));
}

// Real, derived unread counts — a conversation's badge is the count of the
// OTHER party's messages in it that aren't read yet, computed from the same
// per-message `read` flag markConversationRead updates, rather than a
// separately-tracked number that can drift out of sync with it.
export function unreadCountForStudentConversation(convId: string): number {
  return readStudentRaw().filter((m) => m.convId === convId && m.sender !== "student" && !m.read).length;
}

export function unreadCountForTutorConversation(convId: string): number {
  return readTutorRaw().filter((m) => m.convId === convId && m.sender !== "tutor" && !m.read).length;
}

// Total unread across every conversation — for the Message icon's own badge
// (top bar, bottom nav, sidebar), which needs one number across all
// conversations rather than one conversation's count.
export function totalUnreadForTutor(messages: ChatMessage[]): number {
  return messages.filter((m) => m.sender !== "tutor" && !m.read).length;
}

// Structured (non-free-text) message operations — offers, read receipts,
// etc. Not routed through the safety engine; see the module comment above.
// Mirrors the same real-cross-visibility fix as send*Message above — a
// structured Offer message (a Special Offer, a student's Request, etc.)
// needs to actually reach the other party's inbox, not just the sender's
// own. Group Class threads (identified by `studentName` being set — several
// students share one tutor-side conversation) don't mirror to a single
// student array, since there's no one right student to mirror into; that
// stays out of scope per the plan.
export function appendStudentMessage(message: StudentChatMessage): void {
  writeStudent([...readStudentRaw(), message]);
  if (message.sender === "student") {
    const mirrored: ChatMessage = {
      id: message.id,
      convId: message.convId,
      sender: "student",
      text: message.text,
      time: message.time,
      attachments: message.attachments,
      offer: message.offer,
      read: false,
    };
    writeTutor([...readTutorRaw(), mirrored]);
  }
}

export function appendTutorMessage(message: ChatMessage): void {
  writeTutor([...readTutorRaw(), message]);
  if (message.sender === "tutor" && !message.studentName) {
    const mirrored: StudentChatMessage = {
      id: message.id,
      convId: message.convId,
      sender: "other",
      text: message.text,
      time: message.time,
      attachments: message.attachments,
      offer: message.offer,
      read: false,
    };
    writeStudent([...readStudentRaw(), mirrored]);
  }
}

// The one real choke point for accepting/declining/countering an offer —
// finds it on whichever side(s) actually hold it (both, once mirroring is
// in effect; only one, for an older seed conversation created before this)
// and re-checks its live effectiveStatus itself immediately before applying
// the change, rather than trusting whatever the calling UI happened to be
// showing a moment ago. An offer past its real 24-hour expiration is
// rejected here even if the button that triggered this was still enabled.
export type OfferActionResult = { ok: true } | { ok: false; reason: "not-found" | "expired" };

// A message's own id (e.g. "sm-123") and its embedded Offer's own `.id`
// (e.g. "off-6") are deliberately different id spaces (seed data already
// has both) — callers sometimes only have one or the other on hand (a
// render loop naturally has the message's id; a `?offerId=` query param on
// a booking page has the offer's own id), so every lookup here matches
// either, rather than forcing every call site to know which one it has.
function matchesKey(m: { id: string; offer?: Offer }, key: string): boolean {
  return m.id === key || m.offer?.id === key;
}

function findOfferMessage(key: string): Offer | undefined {
  const fromStudent = readStudentRaw().find((m) => matchesKey(m, key))?.offer;
  if (fromStudent) return fromStudent;
  return readTutorRaw().find((m) => matchesKey(m, key))?.offer;
}

export function getLiveOfferById(key: string): Offer | undefined {
  return findOfferMessage(key);
}

// `actor` is which side is making this call — every caller trivially knows
// its own role, and it's what lets this one choke point notify the OTHER
// party with the right message, without every call site having to push its
// own notification by hand.
export function respondToOffer(key: string, apply: (offer: Offer) => Offer, actor: "tutor" | "student" = "tutor"): OfferActionResult {
  const existing = findOfferMessage(key);
  if (!existing) return { ok: false, reason: "not-found" };
  if (effectiveStatus(existing) === "Expired") return { ok: false, reason: "expired" };
  // `apply` is called exactly once — calling it separately per store (the
  // previous shape) could let two `apply` calls that stamp `new
  // Date().toISOString()` (accept-counter, renew, counter-offer) drift a few
  // ms apart between the student's and tutor's mirrored copies of the "same"
  // offer.
  const updated = apply(existing);
  writeStudent(readStudentRaw().map((m) => (matchesKey(m, key) && m.offer ? { ...m, offer: updated } : m)));
  writeTutor(readTutorRaw().map((m) => (matchesKey(m, key) && m.offer ? { ...m, offer: updated } : m)));
  notifyOfferChange(existing, updated, actor);
  return { ok: true };
}

function notifyOfferChange(previous: Offer, updated: Offer, actor: "tutor" | "student"): void {
  const actorName = actor === "tutor" ? updated.tutorName : updated.studentName;
  // Only categories that exist on BOTH notification stores are used here.
  let notification: { category: "Booking" | "Message"; text: string } | null = null;
  if (updated.status === "Accepted" && previous.status !== "Accepted") {
    notification = { category: "Booking", text: `${actorName} accepted the offer for ${updated.subject}.` };
  } else if (updated.status === "Declined" && previous.status !== "Declined") {
    notification = { category: "Message", text: `${actorName} declined the offer for ${updated.subject}.` };
  } else if (updated.status === "Withdrawn" && previous.status !== "Withdrawn") {
    notification = { category: "Message", text: `${actorName} withdrew the offer for ${updated.subject}.` };
  } else if ((updated.history?.length ?? 0) > (previous.history?.length ?? 0) && updated.status === "Sent") {
    notification = { category: "Message", text: `${actorName} sent a counter-offer for ${updated.subject}.` };
  }
  if (!notification) return;

  if (actor === "tutor") {
    pushStudentNotification(notification);
  } else {
    pushTutorNotification(notification);
  }
}

export function subscribeMessages(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(MESSAGES_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MESSAGES_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
