import { Building2, CreditCard, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

export type PaymentMethod = "card" | "bankTransfer" | "wallet";

const methods: { key: PaymentMethod; icon: typeof CreditCard; title: string; description: string; brands: string }[] = [
  { key: "card", icon: CreditCard, title: "Card", description: "Pay securely with your debit or credit card", brands: "VISA · Mastercard · Verve" },
  { key: "bankTransfer", icon: Building2, title: "Bank transfer", description: "Make payment directly from your bank", brands: "GTBank · Access · FirstBank" },
  { key: "wallet", icon: Wallet, title: "Pay with wallet", description: "Use your funded wallet balance", brands: "Ensena wallet" },
];

export function PaymentMethodSelector({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}) {
  return (
    <div className="rounded-2xl border border-ensena-border p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Payment method</h2>
      <p className="mt-1 text-xs text-ensena-muted">Choose your preferred payment method.</p>

      <div className="mt-4 flex flex-col gap-3">
        {methods.map((method) => {
          const Icon = method.icon;
          const selected = value === method.key;
          return (
            <button
              key={method.key}
              type="button"
              onClick={() => onChange(method.key)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left",
                selected ? "border-ensena-primary bg-ensena-primary/5" : "border-ensena-border hover:bg-ensena-bg-soft"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-ensena-primary" : "border-ensena-border"
                )}
              >
                {selected && <span className="size-2.5 rounded-full bg-ensena-primary" />}
              </span>
              <Icon className="size-5 shrink-0 text-ensena-ink" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ensena-ink">{method.title}</p>
                <p className="text-xs text-ensena-muted">{method.description}</p>
              </div>
              <span className="hidden shrink-0 text-xs font-medium text-ensena-muted sm:block">{method.brands}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
