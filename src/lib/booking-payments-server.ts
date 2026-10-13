// Server-only: turning a verified Paystack payment into a paid booking.
// Called from both the checkout callback page and the Paystack webhook —
// whichever arrives first does the work; the other finds nothing left to
// do. The "unpaid → paid" flip is a single conditional UPDATE, so even two
// simultaneous calls can never both record the payment.
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { verifyTransaction } from "@/lib/paystack";

export type FulfilResult =
  | { ok: true; bookingGroupId: string; alreadyProcessed: boolean }
  | { ok: false; reason: "not-paid" | "unknown-booking" | "amount-mismatch" | "error"; message: string; bookingGroupId?: string };

export async function fulfilBookingPayment(reference: string): Promise<FulfilResult> {
  let tx;
  try {
    tx = await verifyTransaction(reference);
  } catch (error) {
    console.error("verifyTransaction failed", error);
    return { ok: false, reason: "error", message: "We couldn't reach Paystack to confirm your payment. Please refresh in a moment." };
  }
  const meta = (tx.metadata ?? {}) as Record<string, unknown>;
  const bookingGroupId = typeof meta.booking_group_id === "string" ? meta.booking_group_id : null;
  const studentId = typeof meta.student_id === "string" ? meta.student_id : null;
  if (!bookingGroupId || !studentId) return { ok: false, reason: "unknown-booking", message: "This payment isn't linked to a booking." };
  if (tx.status !== "success") {
    return { ok: false, reason: "not-paid", bookingGroupId, message: tx.status === "abandoned" ? "The payment wasn't completed." : `Payment status: ${tx.status}.` };
  }

  const admin = getServiceRoleClient();
  const { data: lessons } = await admin
    .from("private_lessons")
    .select("id, tutor_id, subject, price, scheduled_at, payment_status, status")
    .eq("booking_group_id", bookingGroupId)
    .eq("student_id", studentId)
    .order("scheduled_at");
  const rows = (lessons ?? []) as { id: string; tutor_id: string; subject: string; price: number; scheduled_at: string; payment_status: string; status: string }[];
  if (rows.length === 0) return { ok: false, reason: "unknown-booking", message: "We couldn't find the booking for this payment." };

  const expected = rows.reduce((sum, l) => sum + Number(l.price), 0);
  if (tx.currency !== "NGN" || tx.amount < Math.round(expected * 100)) {
    console.error("Paystack amount mismatch", { reference, paid: tx.amount, expected });
    return { ok: false, reason: "amount-mismatch", bookingGroupId, message: "The amount paid doesn't match this booking. Our team has been alerted." };
  }

  const paidAt = tx.paid_at ?? new Date().toISOString();
  // The atomic claim: only rows still unpaid get flipped.
  const { data: claimed, error } = await admin
    .from("private_lessons")
    .update({ payment_status: "paid" })
    .eq("booking_group_id", bookingGroupId)
    .eq("student_id", studentId)
    .eq("payment_status", "unpaid")
    .select("id");
  if (error) return { ok: false, reason: "error", bookingGroupId, message: "We couldn't record your payment. Please refresh in a moment." };
  if (!claimed || claimed.length === 0) return { ok: true, bookingGroupId, alreadyProcessed: true };

  const claimedIds = claimed.map((c) => c.id as string);
  // A paid booking is confirmed — even one whose unpaid hold had lapsed.
  await admin.from("private_lessons").update({ status: "Upcoming" }).in("id", claimedIds).eq("status", "Pending");

  const first = rows[0];
  const amountPaid = tx.amount / 100;
  const [{ data: tutor }, { data: student }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", first.tutor_id).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", studentId).maybeSingle(),
  ]);
  const tutorName = tutor?.full_name?.trim() || "your tutor";
  const studentName = student?.full_name?.trim() || "A student";
  const when = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(first.scheduled_at));
  const sessionsLabel = rows.length === 1 ? "lesson" : `${rows.length} lessons`;

  await Promise.all([
    admin.from("payment_plans").insert({
      kind: "Private",
      booking_id: bookingGroupId,
      student_id: studentId,
      scope: rows.length === 1 ? "session" : "full",
      covers_session_ids: claimedIds,
      amount: amountPaid,
      mode: "oneTime",
      status: "paid",
      paid_at: paidAt,
    }),
    admin.from("wallet_transactions").insert({
      user_id: studentId,
      description: `${first.subject} with ${tutorName} (${sessionsLabel}) · Paystack ${reference}`,
      type: "payment",
      amount: amountPaid,
      direction: "debit",
      status: "completed",
      occurred_at: paidAt,
    }),
    admin.from("booking_events").insert(claimedIds.map((id) => ({ private_lesson_id: id, event_type: "paid", actor_id: studentId, metadata: { provider: "paystack", reference } }))),
    admin.from("notifications").insert([
      {
        user_id: first.tutor_id,
        category: "Booking",
        text: `New booking: ${studentName} booked ${rows.length === 1 ? "a" : rows.length} ${first.subject} ${sessionsLabel === "lesson" ? "lesson" : "lessons"} starting ${when}.`,
        action_url: `/tutor-dashboard/classroom/private/${first.id}`,
        related_booking_id: first.id,
      },
      {
        user_id: studentId,
        category: "Payments",
        text: `Payment received. Your ${first.subject} ${sessionsLabel} with ${tutorName} ${rows.length === 1 ? "is" : "are"} confirmed, starting ${when}.`,
        action_url: `/student-dashboard/lessons?view=${first.id}`,
        related_booking_id: first.id,
      },
    ]),
  ]);

  return { ok: true, bookingGroupId, alreadyProcessed: false };
}
