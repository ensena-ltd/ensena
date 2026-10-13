"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, ShieldX, X } from "lucide-react";

import { useEffectiveAccountStatus } from "@/hooks/use-account-status";
import { useNowMs } from "@/hooks/use-now-ms";
import type { AccountEntityType, AccountStatusRecord } from "@/lib/account-status-store";

// Dismissing the banner and the restriction/warning actually ending are two
// separate things (per the platform's own rule): dismissal only hides THIS
// banner instance from THIS viewer's browser, purely a UI convenience, never
// a write to the restriction record itself. Keyed by status+startedAt (not
// just accountId) so a *new* status transition on the same account — even
// to the same status value, e.g. a fresh 2-day restriction after a prior one
// expired — always reappears; only the exact instance already seen stays
// dismissed. Cleared automatically the moment the underlying status changes,
// since the key itself changes.
const DISMISSED_KEY = "ensena_dismissed_account_status_banners";

function dismissKeyFor(type: AccountEntityType, accountId: string, record: AccountStatusRecord): string {
  return `${type}:${accountId}:${record.status}:${record.startedAt ?? ""}`;
}

function isDismissed(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    const dismissed: string[] = raw ? JSON.parse(raw) : [];
    return dismissed.includes(key);
  } catch {
    return false;
  }
}

function dismiss(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    const dismissed: string[] = raw ? JSON.parse(raw) : [];
    if (dismissed.includes(key)) return;
    // Keep the last 50 — this only needs to remember recent instances, not
    // grow forever.
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([key, ...dismissed].slice(0, 50)));
  } catch {
    // Best-effort convenience only — a failed write just means the banner
    // reappears on next visit, never a functional break.
  }
}

// Real, not cosmetic: reads the SAME effective status the booking/discovery
// enforcement checks read (account-status-store.ts), so this banner can
// never disagree with what the account can actually do — see
// account-permissions.ts. Renders nothing for "Active" (the common case)
// so it's cheap to mount unconditionally on every dashboard page.
function formatExpiry(expiresAt: string, nowMs: number): string {
  const end = new Date(expiresAt).getTime();
  const diffMs = end - nowMs;
  const exact = new Date(expiresAt).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  if (diffMs <= 0) return `Ended ${exact}`;
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays >= 2) return `Ends in ${diffDays} days: ${exact}`;
  if (diffDays === 1) return `Ends tomorrow at ${new Date(expiresAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours >= 1) return `Ends in ${diffHours}h: ${exact}`;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60_000));
  return `Ends in ${diffMinutes}m: ${exact}`;
}

const toneStyles = {
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  orange: "border-orange-200 bg-orange-50 text-orange-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
};

export function AccountStatusBanner({ type, accountId }: { type: AccountEntityType; accountId: string | undefined }) {
  const record = useEffectiveAccountStatus(type, accountId ?? "");
  const nowMs = useNowMs();
  const dismissKey = accountId ? dismissKeyFor(type, accountId, record) : "";
  // Starts false (SSR-safe placeholder) and resolves post-mount, same
  // "don't read localStorage during the server/first-client render" idiom
  // as useNowMs — a hydration mismatch here would just flash the banner
  // briefly rather than break anything, but this keeps it consistent.
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(dismissKey ? isDismissed(dismissKey) : false);
  }, [dismissKey]);

  if (!accountId || record.status === "Active" || dismissed) return null;

  const roleWord = type === "tutor" ? "tutor" : "student";
  // useNowMs() starts at epoch 0 pre-hydration (its own SSR-safety
  // contract) — treated as "real clock not available yet" here rather than
  // fed into formatExpiry, which would otherwise briefly show a nonsense
  // multi-decade countdown before the real time applies post-mount.
  const expiryText = (expiresAt: string) => (nowMs > 0 ? ` ${formatExpiry(expiresAt, nowMs)}.` : "");

  const content = (() => {
    switch (record.status) {
      case "Warning":
        return {
          tone: "amber" as const,
          icon: AlertTriangle,
          title: "Warning Issued",
          body: `Your account has received a warning following a reviewed policy violation${record.reason ? ` (${record.reason})` : ""}. Please review Ensena's policies to avoid further action.`,
        };
      case "UnderReview":
        return {
          tone: "orange" as const,
          icon: ShieldAlert,
          title: "Account Under Review",
          body: `Some account functionality, including new bookings, is temporarily restricted while your case is being reviewed by Ensena Support.${record.reason ? ` Reason: ${record.reason}.` : ""}`,
        };
      case "Restricted":
        return {
          tone: "orange" as const,
          icon: ShieldAlert,
          title: "Temporary Restriction",
          body: `Your account is temporarily restricted from new bookings${record.reason ? ` due to ${record.reason}` : ""}.${record.expiresAt ? expiryText(record.expiresAt) : ""}`,
        };
      case "Suspended":
        return {
          tone: "rose" as const,
          icon: ShieldX,
          title: "Account Suspended",
          body: `Your account is currently suspended${type === "tutor" ? " and hidden from student search" : ""}${record.reason ? ` due to ${record.reason}` : ""}. You cannot make${type === "tutor" ? " or receive" : ""} new bookings while suspended.${record.expiresAt ? expiryText(record.expiresAt) : ""}`,
        };
      case "Banned":
        return {
          tone: "rose" as const,
          icon: ShieldX,
          title: "Account Removed",
          body: `This ${roleWord} account has been permanently removed from Ensena. Contact Support if you believe this is a mistake.`,
        };
      default:
        return null;
    }
  })();

  if (!content) return null;
  const Icon = content.icon;

  return (
    <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 ${toneStyles[content.tone]}`}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{content.title}</p>
        <p className="mt-1 text-sm break-words">{content.body}</p>
      </div>
      {/* Dismisses only this banner instance in this browser — never the
          underlying restriction itself (see dismissKeyFor above). A new
          status change (e.g. a fresh restriction) always shows again. */}
      <button
        type="button"
        onClick={() => {
          if (dismissKey) dismiss(dismissKey);
          setDismissed(true);
        }}
        aria-label="Dismiss notice"
        className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-current/70 hover:bg-black/5"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
