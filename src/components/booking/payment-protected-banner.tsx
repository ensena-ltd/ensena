import { ShieldCheck } from "lucide-react";

// Shared escrow-protection notice shown on both review/payment pages
// (private tutor and group class), directly around the payment section.
export function PaymentProtectedBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-700" />
      <div>
        <p className="text-sm font-semibold text-ensena-ink">Your payment is protected</p>
        <p className="mt-0.5 text-xs text-ensena-muted">
          Your payment is held securely and released to the tutor according to Ensena&apos;s booking and session terms.
        </p>
      </div>
    </div>
  );
}
