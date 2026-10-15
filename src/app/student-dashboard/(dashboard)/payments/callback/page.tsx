import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

import { fulfilBookingPayment } from "@/lib/booking-payments-server";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Payment | Ensena Student Dashboard",
};

// Paystack sends the student back here after checkout with ?reference=…
// The payment is verified with Paystack server-side — never trusted from
// the URL — then the booking is marked paid (if the webhook hasn't already).
export default async function PaymentCallbackPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const profile = await requireRole("student");
  const params = await searchParams;
  const reference = params.reference ?? params.trxref ?? "";
  const result = profile && reference ? await fulfilBookingPayment(reference) : null;
  const success = result?.ok === true;

  // A paid booking goes straight to its confirmation page.
  if (profile && result?.ok) {
    const { data: lesson } = await getServiceRoleClient().from("private_lessons").select("tutor_id").eq("booking_group_id", result.bookingGroupId).eq("student_id", profile.id).limit(1).maybeSingle();
    if (lesson?.tutor_id) redirect(`/student-dashboard/tutors/${lesson.tutor_id}/book/confirmation?booking=${result.bookingGroupId}`);
  }

  return (
    <div className="mx-auto mt-10 max-w-md rounded-3xl border border-ensena-border bg-ensena-surface p-8 text-center">
      {success ? <CheckCircle2 className="mx-auto size-12 text-ensena-success" /> : <XCircle className="mx-auto size-12 text-rose-500" />}
      <h1 className="mt-3 font-heading text-xl font-semibold text-ensena-ink">{success ? "Payment successful" : "Payment not completed"}</h1>
      <p className="mt-2 text-sm text-ensena-muted">
        {success
          ? "Your booking is confirmed and your tutor has been notified. You'll find it under My Classes."
          : (result && !result.ok ? result.message : "We couldn't find a payment to confirm.") + " Your booking is saved. You can try paying again from My Classes."}
      </p>
      {reference && <p className="mt-2 text-xs text-ensena-muted">Reference: {reference}</p>}
      <div className="mt-6 flex flex-col gap-2">
        <Link href="/student-dashboard/lessons?tab=Upcoming" className="rounded-full bg-ensena-primary px-5 py-2.5 text-sm font-semibold text-white">
          Go to My Classes
        </Link>
        <Link href="/student-dashboard" className="text-sm font-medium text-ensena-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
