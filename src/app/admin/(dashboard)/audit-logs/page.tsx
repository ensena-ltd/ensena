import Link from "next/link";
import { History } from "lucide-react";

export default function AdminAuditLogsPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Audit Logs</h1>
      <p className="mt-1 text-sm text-ensena-muted">Platform-wide action history.</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ensena-border bg-ensena-surface py-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
          <History className="size-6" />
        </span>
        <p className="font-medium text-ensena-ink">Escrow &amp; payment audit trail is live</p>
        <p className="max-w-sm text-sm text-ensena-muted">
          Every escrow release, freeze, refund, and dispute is already logged. View it under{" "}
          <Link href="/admin/lesson-confirmations" className="font-medium text-ensena-primary">Escrow &amp; Disputes</Link>. Platform-wide logs (logins, edits, admin actions) are coming soon.
        </p>
      </div>
    </div>
  );
}
