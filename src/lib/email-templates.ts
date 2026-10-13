// Real email content for every major booking event — used by email-service.ts.
// No SMTP/email-API provider is configured in this app (confirmed: no
// NEXT_PUBLIC_*MAIL* / RESEND / SENDGRID env vars anywhere), so these
// templates render real subject/body text that a real provider adapter
// would hand off to Postmark/Resend/SES/etc. once one exists — see
// email-service.ts's own doc comment for exactly what "sending" means today.
import { formatNaira } from "@/lib/format";

export type EmailTemplateId =
  | "booking_confirmed"
  | "booking_rescheduled"
  | "booking_cancelled_by_student"
  | "booking_cancelled_by_tutor"
  | "refund_initiated"
  | "refund_completed"
  | "teacher_no_show"
  | "student_no_show"
  | "support_ticket_created"
  | "support_ticket_replied"
  | "support_ticket_resolved";

export interface EmailContent {
  subject: string;
  bodyText: string;
}

const SUPPORT_EMAIL = "support@ensena.co";
const SITE_URL = "https://ensena.co";

function footer(bookingUrl?: string): string {
  const link = bookingUrl ? `\nView your booking: ${SITE_URL}${bookingUrl}\n` : "";
  return `${link}\nNeed help? Contact us at ${SUPPORT_EMAIL}.\n\n— The Enseña Team`;
}

export interface BookingEmailVars {
  recipientName: string;
  otherPartyName?: string;
  subject: string;
  date?: string;
  time?: string;
  bookingReference: string;
  bookingUrl?: string;
  refundAmount?: number;
  // True only when a refund was actually owed but couldn't be processed
  // (no real paid PaymentPlan existed to draw it from) — distinct from
  // refundAmount being 0/absent because no refund was owed at all, so the
  // email never claims a refund "has been issued" when it didn't happen.
  refundFailed?: boolean;
  newDate?: string;
  newTime?: string;
  // Support-ticket templates only.
  messageBody?: string;
}

export function renderEmail(template: EmailTemplateId, v: BookingEmailVars): EmailContent {
  switch (template) {
    case "booking_confirmed":
      return {
        subject: `Booking confirmed: ${v.subject} · #${v.bookingReference}`,
        bodyText: `Hi ${v.recipientName},\n\nYour ${v.subject} session with ${v.otherPartyName} is confirmed for ${v.date} at ${v.time}.\n\nBooking reference: ${v.bookingReference}${footer(v.bookingUrl)}`,
      };
    case "booking_rescheduled":
      return {
        subject: `Your session was rescheduled: ${v.subject} · #${v.bookingReference}`,
        bodyText: `Hi ${v.recipientName},\n\nYour ${v.subject} session with ${v.otherPartyName} has been rescheduled.\n\nPrevious: ${v.date} · ${v.time}\nNew: ${v.newDate} · ${v.newTime}\n\nBooking reference: ${v.bookingReference}${footer(v.bookingUrl)}`,
      };
    case "booking_cancelled_by_student":
      return {
        subject: `Booking cancelled: ${v.subject} · #${v.bookingReference}`,
        bodyText: `Hi ${v.recipientName},\n\n${v.otherPartyName} cancelled their ${v.subject} session scheduled for ${v.date} at ${v.time}.\n\nBooking reference: ${v.bookingReference}${footer(v.bookingUrl)}`,
      };
    case "booking_cancelled_by_tutor": {
      const refundClause = v.refundFailed
        ? ` We attempted to refund ${formatNaira(v.refundAmount ?? 0)} but it couldn't be processed automatically. Please contact ${SUPPORT_EMAIL} so we can sort this out.`
        : v.refundAmount
          ? ` A full refund of ${formatNaira(v.refundAmount)} has been issued.`
          : "";
      return {
        subject: `Your session was cancelled: ${v.subject} · #${v.bookingReference}`,
        bodyText: `Hi ${v.recipientName},\n\nYour ${v.subject} session with ${v.otherPartyName} on ${v.date} at ${v.time} was cancelled by the teacher.${refundClause}\n\nBooking reference: ${v.bookingReference}${footer(v.bookingUrl)}`,
      };
    }
    case "refund_initiated":
      return {
        subject: `Refund initiated: #${v.bookingReference}`,
        bodyText: `Hi ${v.recipientName},\n\nA refund of ${formatNaira(v.refundAmount ?? 0)} for your ${v.subject} booking has been initiated and is processing.\n\nBooking reference: ${v.bookingReference}${footer(v.bookingUrl)}`,
      };
    case "refund_completed":
      return {
        subject: `Refund completed: #${v.bookingReference}`,
        bodyText: `Hi ${v.recipientName},\n\nYour refund of ${formatNaira(v.refundAmount ?? 0)} for your ${v.subject} booking has been completed.\n\nBooking reference: ${v.bookingReference}${footer(v.bookingUrl)}`,
      };
    case "teacher_no_show":
      return {
        subject: `We're sorry your teacher didn't join: #${v.bookingReference}`,
        bodyText: `Hi ${v.recipientName},\n\nYour teacher did not join your ${v.subject} session on ${v.date} at ${v.time}. We've issued a full refund of ${formatNaira(v.refundAmount ?? 0)} and are following up with the teacher.\n\nBooking reference: ${v.bookingReference}${footer(v.bookingUrl)}`,
      };
    case "student_no_show":
      return {
        subject: `Your student didn't join: #${v.bookingReference}`,
        bodyText: `Hi ${v.recipientName},\n\nYour student did not join the ${v.subject} session scheduled for ${v.date} at ${v.time}. Per Enseña's policy, this session is not refunded to the student.\n\nBooking reference: ${v.bookingReference}${footer(v.bookingUrl)}`,
      };
    case "support_ticket_created":
      return {
        subject: `We've received your request: #${v.bookingReference}`,
        bodyText: `Hi ${v.recipientName},\n\nThanks for reaching out about "${v.subject}". Our support team has opened ticket #${v.bookingReference} and will get back to you as soon as possible.${footer(v.bookingUrl)}`,
      };
    case "support_ticket_replied":
      return {
        subject: `New reply on your ticket: #${v.bookingReference}`,
        bodyText: `Hi ${v.recipientName},\n\n${v.otherPartyName ?? "Our support team"} replied to your ticket "${v.subject}":\n\n"${v.messageBody}"\n\nBooking reference: ${v.bookingReference}${footer(v.bookingUrl)}`,
      };
    case "support_ticket_resolved":
      return {
        subject: `Your ticket has been resolved: #${v.bookingReference}`,
        bodyText: `Hi ${v.recipientName},\n\nYour ticket "${v.subject}" has been marked resolved. If this didn't fully address your issue, just reply to reopen it.\n\nBooking reference: ${v.bookingReference}${footer(v.bookingUrl)}`,
      };
  }
}
