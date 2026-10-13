import { formatNaira } from "@/lib/format";
import { useBookingPaymentSummary } from "@/hooks/use-payment-plans";
import { formatPaymentPlanLabel } from "@/lib/payment-plans-store";

// Separate from the existing PaymentCard (lesson price / service fee /
// total paid) — this card answers "what did the student actually sign up to
// PAY" (One-time / Recurring · Weekly / Recurring · Monthly), which is a
// genuinely different fact from the lesson's own SCHEDULE frequency (see
// ScheduleSummaryCard) — a 3x/week booking can still be a one-time payment,
// and a once-a-week booking can be billed monthly. This card used to render
// the lesson's schedule frequencyLabel under a "Payment Plan" heading, which
// was simply wrong whenever the two didn't match; it now reads the real
// payment record via getBookingPaymentSummary (payment-plans-store.ts) —
// the one authoritative source every dashboard (student/tutor/admin) shares.
export function PaymentPlanCard({
  bookingId,
  amountPaid,
  sessionsCovered,
}: {
  bookingId: string;
  amountPaid: number;
  sessionsCovered?: number;
}) {
  const summary = useBookingPaymentSummary(bookingId);
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Payment Plan</h2>
      <div className="mt-3 flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ensena-muted">Plan</span>
          <span className="font-medium text-ensena-ink">{formatPaymentPlanLabel(summary)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ensena-muted">Amount Paid</span>
          <span className="font-medium text-ensena-ink">{formatNaira(amountPaid)}</span>
        </div>
        {sessionsCovered !== undefined && sessionsCovered > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-ensena-muted">Sessions Covered</span>
            <span className="font-medium text-ensena-ink">{sessionsCovered}</span>
          </div>
        )}
      </div>
    </div>
  );
}
