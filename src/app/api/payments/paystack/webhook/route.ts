import { NextResponse, type NextRequest } from "next/server";

import { fulfilBookingPayment } from "@/lib/booking-payments-server";
import { isValidWebhookSignature } from "@/lib/paystack";

// Paystack → Ensena payment webhook. Set this URL in the Paystack dashboard
// (Settings → API Keys & Webhooks): https://<your-domain>/api/payments/paystack/webhook
// It's the safety net for a student who pays but never makes it back to the
// callback page (closed tab, lost connection). Every event is signature-
// checked, and the payment is re-verified with Paystack's API before anything
// is recorded, so a forged request can't mark a booking paid.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!isValidWebhookSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string; metadata?: { kind?: string } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  if (event.event === "charge.success" && event.data?.reference && event.data.metadata?.kind === "private_lessons") {
    const result = await fulfilBookingPayment(event.data.reference);
    // A temporary failure (Paystack/DB unreachable) asks Paystack to retry.
    if (!result.ok && result.reason === "error") return NextResponse.json({ error: result.message }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
