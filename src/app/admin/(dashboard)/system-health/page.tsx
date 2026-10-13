import { Activity, CheckCircle2 } from "lucide-react";

export default function AdminSystemHealthPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">System Health</h1>
      <p className="mt-1 text-sm text-ensena-muted">Live status of Ensena&apos;s core systems.</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {["API", "Payments (Paystack)", "Payments (Flutterwave)", "Video Classroom", "Messaging", "Email Delivery"].map((s) => (
          <div key={s} className="flex items-center justify-between rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <span className="flex items-center gap-2 text-sm font-medium text-ensena-ink">
              <Activity className="size-4 text-ensena-muted" /> {s}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-ensena-success">
              <CheckCircle2 className="size-3.5" /> Operational
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
