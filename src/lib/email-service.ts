// The one real place a booking-event email gets "sent" from. There is no
// SMTP/email-API provider configured anywhere in this app (no RESEND_API_KEY,
// no SENDGRID key, no NEXT_PUBLIC_*MAIL* env var — confirmed by inspection),
// so "sending" here means rendering the real template (email-templates.ts)
// and writing a real, persisted EmailLog record — never a fake toast that
// claims delivery with nothing behind it. This is the same honest-simulation
// idiom as chargeSubscription's billing tick: a real event record, created
// synchronously because no real async provider exists yet, structured so a
// future real provider adapter only needs to replace `deliver()` below.
import { renderEmail, type BookingEmailVars, type EmailTemplateId } from "@/lib/email-templates";
import { notifyMyBookingConfirmed } from "@/lib/actions/notifications";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type EmailDeliveryStatus = "sent" | "failed";

export interface EmailLog {
  id: string;
  to: string;
  template: EmailTemplateId;
  subject: string;
  bodyText: string;
  bookingId?: string;
  status: EmailDeliveryStatus;
  failureReason?: string;
  sentAtMs: number;
}

const EMAIL_LOG_KEY = "ensena_email_log";
export const EMAIL_EVENT = "ensena:email-changed";

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

const EMPTY: EmailLog[] = [];
const readRaw = makeCachedReader<EmailLog[]>(EMAIL_LOG_KEY, EMPTY);

function writeJson(value: EmailLog[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EMAIL_LOG_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(EMAIL_EVENT));
}

// No real provider to fail against — "deliver" is a pure local write. A real
// provider adapter (Postmark/Resend/SES) would replace ONLY this function
// with an actual API call, catching real failures into the same
// `failed`/`failureReason` shape already modeled here.
function deliver(): { status: EmailDeliveryStatus; failureReason?: string } {
  return { status: "sent" };
}

export function sendBookingEmail(input: {
  to: string;
  template: EmailTemplateId;
  bookingId?: string;
  vars: BookingEmailVars;
}): EmailLog {
  const { subject, bodyText } = renderEmail(input.template, input.vars);
  const result = deliver();
  const log: EmailLog = {
    id: `email-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    to: input.to,
    template: input.template,
    subject,
    bodyText,
    bookingId: input.bookingId,
    status: result.status,
    failureReason: result.failureReason,
    sentAtMs: Date.now(),
  };
  writeJson([log, ...readRaw()]);

  // Real delivery: a booking confirmation goes to the signed-in student who
  // just booked — by email (Resend, noreply@ensena.co) and/or push, per their
  // notification settings. Other templates are addressed to the other party
  // and stay local until those flows move to the database.
  if (input.template === "booking_confirmed" && typeof window !== "undefined" && isSupabaseConfigured()) {
    void notifyMyBookingConfirmed({
      tutorName: input.vars.otherPartyName ?? "your tutor",
      subject: input.vars.subject ?? "lesson",
      date: input.vars.date ?? "",
      time: input.vars.time ?? "",
      reference: input.vars.bookingReference,
      url: input.vars.bookingUrl,
    }).catch(() => undefined);
  }
  return log;
}

export function getEmailLog(): EmailLog[] {
  return readRaw();
}

export function getEmailsForBooking(bookingId: string): EmailLog[] {
  return readRaw().filter((e) => e.bookingId === bookingId);
}

export function subscribeEmailLog(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EMAIL_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EMAIL_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
