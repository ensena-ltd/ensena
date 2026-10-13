import { useState } from "react";
import { Check, Copy } from "lucide-react";

function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy ID"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="text-ensena-muted hover:text-ensena-primary"
    >
      {copied ? <Check className="size-4 text-ensena-success" /> : <Copy className="size-4" />}
    </button>
  );
}

// Shared by the Student and Tutor View Class pages — identical either way,
// a booking reference means the same thing to both parties.
export function BookingInfoCard({ bookingId, label = "Booking ID" }: { bookingId: string; label?: string }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Booking Information</h2>
      <p className="mt-3 text-xs text-ensena-muted">{label}</p>
      <p className="flex items-center gap-2 font-mono text-base font-semibold text-ensena-ink">
        {bookingId} <CopyId value={bookingId} />
      </p>
      <p className="mt-2 text-xs text-ensena-muted">This is your unique booking reference. It is used for all communications related to this lesson.</p>
    </div>
  );
}
