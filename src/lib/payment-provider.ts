// The seam between Enseña's own marketplace/ledger logic (payment-plans-
// store.ts, escrow-store.ts, payout-store.ts — all real, all built this
// session) and whichever REGULATED payment company actually moves money.
// Nothing in this app calls a real Paystack/Flutterwave/etc. API today —
// there are no provider API keys configured anywhere (confirmed: no
// PAYSTACK_*/FLUTTERWAVE_* env vars exist) — so every "charge"/"payout" this
// app performs is Enseña's own local ledger write, never a real financial
// transaction. This file exists so that stays true by DESIGN, not by
// accident: every place that would eventually need to call a real provider
// goes through this one interface, so plugging in a real Paystack adapter
// later means writing ONE new class here, not hunting through the app for
// every spot that assumes money moved.
//
// This deliberately does NOT wire itself into payment-plans-store.ts's
// recordPayment/chargeSubscription or payout-store.ts's requestPayout in
// this pass — doing so would either (a) require real provider credentials
// this environment doesn't have, or (b) silently swap working, tested
// simulated flows for calls to a SimulatedPaymentProvider that behaves
// identically, which is churn with no behavioral change. The abstraction is
// built and ready; wiring it in is a deliberate, separate decision once a
// real provider is actually being integrated.
export type PaymentProviderName = "simulated" | "paystack" | "flutterwave";

export interface ChargeRequest {
  amount: number;
  currency: "NGN";
  reference: string;
  customerEmail: string;
  metadata?: Record<string, string>;
}

export interface ChargeResult {
  status: "success" | "failed" | "pending";
  providerReference: string;
  failureReason?: string;
}

export interface PayoutRequest {
  amount: number;
  currency: "NGN";
  bankCode: string;
  accountNumber: string;
  accountName: string;
  reference: string;
}

export interface PayoutResult {
  status: "success" | "failed" | "pending";
  providerReference: string;
  failureReason?: string;
}

// The regulated-provider functions Enseña itself must never perform
// in-house without the appropriate licence — see the architecture note in
// this file's header. Everything else (ledger, commission split, refund
// policy, dispute resolution, UX) stays Enseña-owned regardless of which
// class implements this interface.
export interface PaymentProviderAdapter {
  readonly name: PaymentProviderName;
  initiateCharge(req: ChargeRequest): Promise<ChargeResult>;
  verifyCharge(providerReference: string): Promise<ChargeResult>;
  initiatePayout(req: PayoutRequest): Promise<PayoutResult>;
  // Real providers sign webhook payloads (Paystack: X-Paystack-Signature,
  // Flutterwave: verif-hash) so a caller can prove a webhook actually came
  // from the provider rather than a spoofed request — required before ANY
  // real provider adapter processes a webhook-driven state change.
  verifyWebhookSignature(payload: string, signature: string): boolean;
}

// The only adapter that actually exists today. Every method resolves
// synchronously and always succeeds — it is NOT a payment gateway, it is a
// placeholder that makes the interface concrete and testable before a real
// provider is chosen. Nothing calls this directly from the app's real
// payment flows yet (see header note) — it exists so `getActivePaymentProvider()`
// always has something real to return.
export class SimulatedPaymentProvider implements PaymentProviderAdapter {
  readonly name = "simulated" as const;

  async initiateCharge(req: ChargeRequest): Promise<ChargeResult> {
    return { status: "success", providerReference: `SIM-${req.reference}` };
  }

  async verifyCharge(providerReference: string): Promise<ChargeResult> {
    return { status: "success", providerReference };
  }

  async initiatePayout(req: PayoutRequest): Promise<PayoutResult> {
    return { status: "success", providerReference: `SIM-${req.reference}` };
  }

  verifyWebhookSignature(): boolean {
    // No real webhook secret exists for a provider that isn't integrated —
    // honestly reject rather than pretend to verify something unverifiable.
    return false;
  }
}

let activeProvider: PaymentProviderAdapter = new SimulatedPaymentProvider();

// Swapping providers later (once real credentials exist) means calling this
// once, e.g. `setActivePaymentProvider(new PaystackProvider(apiKey))` — no
// other file needs to know which provider is active.
export function setActivePaymentProvider(provider: PaymentProviderAdapter): void {
  activeProvider = provider;
}

export function getActivePaymentProvider(): PaymentProviderAdapter {
  return activeProvider;
}
