"use client";

// Payment Plan — placed between "Your Schedule" and "Payment Method" on both
// booking review pages. Private and Group Class deliberately get two
// separate exports with two separate option sets (a Private one-time/
// recurring choice vs a Group week/month/full plan) rather than one
// component trying to serve both shapes — "be very careful not to apply
// Group Class payment logic to Private Class or vice versa." Both reuse the
// exact same radio-row visual language as PaymentMethodSelector so this
// feels like an existing part of the page, not a new component style.
import type { FrequencyKey } from "@/components/find-teachers/tutor-booking-sidebar";
import type { PaymentOption } from "@/lib/payment-options";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

function RadioRow({
  selected,
  onSelect,
  title,
  description,
  amount,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  amount?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border p-4", selected ? "border-ensena-primary bg-ensena-primary/5" : "border-ensena-border")}>
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 text-left">
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
            selected ? "border-ensena-primary" : "border-ensena-border"
          )}
        >
          {selected && <span className="size-2.5 rounded-full bg-ensena-primary" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ensena-ink">{title}</p>
            {amount !== undefined && <p className="text-sm font-semibold text-ensena-ink">{formatNaira(amount)}</p>}
          </div>
          <p className="text-xs text-ensena-muted">{description}</p>
        </div>
      </button>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Private Class — One-time vs Recurring. Recurring's interval is never a
// separate choice: it's whatever the booking's own frequency already is
// (weekly/monthly), decided earlier in the booking flow. A one-time
// (single-lesson) booking has nothing to recur, so it never shows this
// selector at all — just the plain "One-time payment" line the spec's own
// example shows.
// ---------------------------------------------------------------------------
export type PrivatePaymentPlan = "oneTime" | "recurring";

export function PrivatePaymentPlanSelector({
  frequency,
  value,
  onChange,
}: {
  frequency: FrequencyKey;
  value: PrivatePaymentPlan;
  onChange: (plan: PrivatePaymentPlan) => void;
}) {
  if (frequency === "oneTime") {
    return (
      <div className="rounded-2xl border border-ensena-border p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Payment Plan</h2>
        <p className="mt-2 text-sm font-medium text-ensena-ink">One-time payment</p>
      </div>
    );
  }

  const intervalWord = frequency === "weekly" ? "week" : "month";

  return (
    <div className="rounded-2xl border border-ensena-border p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Payment Plan</h2>
      <p className="mt-1 text-xs text-ensena-muted">Choose how you&apos;d like to pay for this booking.</p>
      <div className="mt-3 flex flex-col gap-3">
        <RadioRow
          selected={value === "oneTime"}
          onSelect={() => onChange("oneTime")}
          title="One-time"
          description="Pay once for this booking. No future automatic charges."
        />
        <RadioRow
          selected={value === "recurring"}
          onSelect={() => onChange("recurring")}
          title="Recurring"
          description={`You'll be charged every ${intervalWord} according to your booking schedule. Cancel anytime.`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group Class — Pay for a week / Pay monthly / Pay for the full booking,
// each drawn from the exact same computePaymentOptions() calculator the
// booking sidebar already uses (payment-options.ts) — this only regroups
// those same options into three primary choices with an optional nested
// "make this recurring" checkbox, per the requested UI, rather than
// duplicating the amount/eligibility logic. The recurring checkbox is
// simply absent from "Pay for the full booking" because
// computePaymentOptions never generates a recurring "full" option — there is
// nothing to toggle, so nothing renders.
// ---------------------------------------------------------------------------
export function GroupPaymentPlanSelector({
  options,
  selectedId,
  onChange,
}: {
  options: PaymentOption[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  const weekOption = options.find((o) => o.id === "week");
  const weekAutoOption = options.find((o) => o.id === "weeklyAuto");
  const monthOption = options.find((o) => o.id === "month");
  const monthAutoOption = options.find((o) => o.id === "monthlyAuto");
  const fullOption = options.find((o) => o.id === "full");

  const weekGroupSelected = selectedId === "week" || selectedId === "weeklyAuto";
  const monthGroupSelected = selectedId === "month" || selectedId === "monthlyAuto";

  return (
    <div className="rounded-2xl border border-ensena-border p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Payment Plan</h2>
      <p className="mt-1 text-xs text-ensena-muted">Choose how you&apos;d like to pay for this class.</p>
      <div className="mt-3 flex flex-col gap-3">
        {weekOption && (
          <RadioRow
            selected={weekGroupSelected}
            onSelect={() => onChange("week")}
            title={weekOption.label}
            description={weekOption.description}
            amount={weekGroupSelected && selectedId === "weeklyAuto" ? weekAutoOption!.amount : weekOption.amount}
          >
            {weekAutoOption && weekGroupSelected && (
              <label className="ml-8 mt-3 flex items-center gap-2.5 border-t border-ensena-border pt-3 text-sm text-ensena-ink">
                <input
                  type="checkbox"
                  checked={selectedId === "weeklyAuto"}
                  onChange={(e) => onChange(e.target.checked ? "weeklyAuto" : "week")}
                  className="size-4 rounded border-ensena-border accent-ensena-primary"
                />
                Make this a recurring payment
              </label>
            )}
            {selectedId === "weeklyAuto" && (
              <p className="ml-8 mt-1.5 text-xs text-ensena-muted">You&apos;ll be charged every week according to your booking schedule.</p>
            )}
          </RadioRow>
        )}

        {monthOption && (
          <RadioRow
            selected={monthGroupSelected}
            onSelect={() => onChange("month")}
            title={monthOption.label}
            description={monthOption.description}
            amount={monthGroupSelected && selectedId === "monthlyAuto" ? monthAutoOption!.amount : monthOption.amount}
          >
            {monthAutoOption && monthGroupSelected && (
              <label className="ml-8 mt-3 flex items-center gap-2.5 border-t border-ensena-border pt-3 text-sm text-ensena-ink">
                <input
                  type="checkbox"
                  checked={selectedId === "monthlyAuto"}
                  onChange={(e) => onChange(e.target.checked ? "monthlyAuto" : "month")}
                  className="size-4 rounded border-ensena-border accent-ensena-primary"
                />
                Make this a recurring payment
              </label>
            )}
            {selectedId === "monthlyAuto" && (
              <p className="ml-8 mt-1.5 text-xs text-ensena-muted">You&apos;ll be charged every month according to your booking schedule.</p>
            )}
          </RadioRow>
        )}

        {fullOption && (
          <RadioRow
            selected={selectedId === "full"}
            onSelect={() => onChange("full")}
            title={fullOption.label}
            description={fullOption.description}
            amount={fullOption.amount}
          />
        )}
      </div>
    </div>
  );
}
