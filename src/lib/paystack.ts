// Server-only Paystack client (https://paystack.com/docs/api/transaction).
// Needs PAYSTACK_SECRET_KEY in the environment — a test key (sk_test_…)
// works end-to-end with Paystack's test cards. The secret key never leaves
// the server; the browser is only ever sent Paystack's hosted checkout URL.
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.paystack.co";

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set.");
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !body?.status || body.data === undefined) {
    throw new Error(`Paystack ${path} failed: ${body?.message ?? res.statusText}`);
  }
  return body.data;
}

export interface PaystackTransaction {
  reference: string;
  status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "processing" | "queued" | "reversed";
  /** In kobo. */
  amount: number;
  currency: string;
  paid_at: string | null;
  metadata: Record<string, unknown> | null;
  customer?: { email?: string };
}

/** Starts a checkout; returns Paystack's hosted payment page URL. */
export async function initializeTransaction(input: {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<{ authorizationUrl: string; reference: string }> {
  const data = await call<{ authorization_url: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountNaira * 100),
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
  return { authorizationUrl: data.authorization_url, reference: data.reference };
}

/** The transaction as Paystack sees it — the only trustworthy source of "was this paid". */
export async function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Webhooks are signed with HMAC-SHA512 of the raw body using the secret key. */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !isPaystackConfigured()) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
