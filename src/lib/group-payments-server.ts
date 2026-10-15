// Server-only: pricing and paying for a group-class cohort. The price is
// always recomputed here from the database — never taken from the browser —
// and the student is only enrolled once the payment is recorded.
import { parseSchedule } from "@/lib/group-classes-server";
import { computePaymentOptions, type PaymentOption } from "@/lib/payment-options";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";

type Row = Record<string, unknown>;

export interface GroupQuote {
  classId: string;
  slug: string;
  title: string;
  tutorId: string;
  cohortId: string;
  option: PaymentOption;
  coveredSessionIds: string[];
  firstSessionAt: string | null;
}

export type GroupQuoteResult = { ok: true; quote: GroupQuote } | { ok: false; message: string };

export async function quoteGroupEnrollment(cohortId: string, planId: string): Promise<GroupQuoteResult> {
  const admin = getServiceRoleClient();
  const { data: cohort } = await admin.from("group_class_cohorts").select("id, group_class_id, schedule, seats_total, seats_filled, price, status").eq("id", cohortId).maybeSingle();
  if (!cohort) return { ok: false, message: "We couldn't find that class schedule." };
  if (cohort.status === "Cancelled" || cohort.status === "Completed") return { ok: false, message: "This cohort is no longer taking students." };
  const { data: cls } = await admin.from("group_classes").select("id, slug, title, tutor_id, status").eq("id", cohort.group_class_id).maybeSingle();
  if (!cls || cls.status !== "Published") return { ok: false, message: "This class isn't available any more." };

  const { data: sessionRows } = await admin.from("group_class_sessions").select("id, scheduled_at, status").eq("cohort_id", cohortId).neq("status", "Cancelled").order("scheduled_at");
  const sessions = (sessionRows ?? []) as Row[];
  const nowMs = Date.now();
  const upcoming = sessions.filter((s) => s.status === "Scheduled" && new Date(s.scheduled_at as string).getTime() > nowMs);
  if (upcoming.length === 0) return { ok: false, message: "This cohort has no sessions left to join." };

  const schedule = parseSchedule(cohort.schedule);
  const price = Number(cohort.price) || 0;
  const options = computePaymentOptions({
    sessionCount: sessions.length,
    sessionsPerWeek: Math.max(1, schedule.days.length),
    totalWeeks: schedule.weeks,
    pricePerSession: sessions.length > 0 ? Math.round(price / sessions.length) : price,
  }).filter((o) => o.id !== "installment");
  const option = options.find((o) => o.id === planId);
  if (!option) return { ok: false, message: "Please choose a payment plan." };

  // A full-course payment covers every session; shorter plans cover the next ones coming up.
  const covered = option.scope === "full" ? sessions : upcoming.slice(0, option.sessionsCovered);
  return {
    ok: true,
    quote: {
      classId: cls.id as string,
      slug: cls.slug as string,
      title: cls.title as string,
      tutorId: cls.tutor_id as string,
      cohortId,
      option,
      coveredSessionIds: covered.map((s) => s.id as string),
      firstSessionAt: (upcoming[0]?.scheduled_at as string) ?? null,
    },
  };
}

export type GroupPaidResult =
  | { ok: true; enrollmentId: string; slug: string; alreadyProcessed: boolean }
  | { ok: false; message: string; slug?: string };

/** Enrolls the student and records the payment, ledger entry and notifications. */
export async function recordGroupEnrollmentPaid(input: {
  studentId: string;
  quote: GroupQuote;
  amountPaid: number;
  paidAt: string;
  provider: "paystack" | "test";
  reference: string;
}): Promise<GroupPaidResult> {
  const { studentId, quote, amountPaid, paidAt, provider, reference } = input;
  const admin = getServiceRoleClient();
  const { data: enrollment, error } = await admin.rpc("enroll_student_in_group_class", { p_student_id: studentId, p_cohort_id: quote.cohortId, p_plan: quote.option.id });
  if (error || !enrollment) {
    if (error?.message?.includes("ALREADY_ENROLLED")) {
      const { data: existing } = await admin.from("group_class_enrollments").select("id").eq("cohort_id", quote.cohortId).eq("student_id", studentId).eq("status", "Active").maybeSingle();
      if (existing) return { ok: true, enrollmentId: existing.id as string, slug: quote.slug, alreadyProcessed: true };
    }
    console.error("enroll_student_in_group_class failed", { reference, error });
    const full = error?.message?.includes("full");
    return {
      ok: false,
      slug: quote.slug,
      message: full
        ? "Sorry, this cohort filled up while you were paying. Ensena Support will refund you, or move you to the next cohort."
        : "We couldn't complete your enrollment. Please contact Ensena Support with your payment reference.",
    };
  }
  const e = enrollment as { id: string; booking_reference: string };
  const { option } = quote;

  const [{ data: tutor }, { data: student }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", quote.tutorId).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", studentId).maybeSingle(),
  ]);
  const tutorName = tutor?.full_name?.trim() || "your tutor";
  const studentName = student?.full_name?.trim() || "A student";
  const when = quote.firstSessionAt
    ? new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(quote.firstSessionAt))
    : "soon";
  const providerLabel = provider === "paystack" ? `Paystack ${reference}` : `Test payment ${reference}`;

  let subscriptionId: string | null = null;
  if (option.mode === "recurring") {
    const days = option.scope === "week" ? 7 : 30;
    const { data: sub } = await admin
      .from("subscriptions")
      .insert({
        kind: "Group",
        booking_id: e.id,
        student_id: studentId,
        frequency: option.scope === "week" ? "weekly" : "monthly",
        amount_per_charge: option.amount,
        next_charge_at: new Date(Date.now() + days * 86_400_000).toISOString(),
        status: "active",
        payment_method_ref: provider,
      })
      .select("id")
      .single();
    subscriptionId = (sub?.id as string) ?? null;
  }

  await Promise.all([
    admin.from("payment_plans").insert({
      kind: "Group",
      booking_id: e.id,
      student_id: studentId,
      scope: option.scope === "session" ? "session" : option.scope,
      covers_session_ids: quote.coveredSessionIds,
      amount: amountPaid,
      mode: option.mode,
      subscription_id: subscriptionId,
      status: "paid",
      paid_at: paidAt,
    }),
    admin.from("wallet_transactions").insert({
      user_id: studentId,
      description: `${quote.title} with ${tutorName} (group class) · ${providerLabel}`,
      type: "payment",
      amount: amountPaid,
      direction: "debit",
      status: "completed",
      occurred_at: paidAt,
    }),
    admin.from("booking_events").insert({ group_class_enrollment_id: e.id, event_type: "paid", actor_id: studentId, metadata: { provider, reference, plan: option.id } }),
    admin.from("notifications").insert([
      {
        user_id: quote.tutorId,
        category: "Booking",
        text: `New enrollment: ${studentName} joined ${quote.title}, starting ${when}.`,
        action_url: `/tutor-dashboard/group-classes`,
      },
      {
        user_id: studentId,
        category: "Payments",
        text: `Payment received. You're enrolled in ${quote.title} with ${tutorName}, starting ${when}.`,
        action_url: `/student-dashboard/group-classes/${quote.classId}`,
      },
    ]),
  ]);

  return { ok: true, enrollmentId: e.id, slug: quote.slug, alreadyProcessed: false };
}
