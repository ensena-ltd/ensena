"use client";

import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

import { useTutorNotifications } from "@/hooks/use-tutor-notifications";

// Tutor-facing mirror of student-dashboard/important-updates-banner.tsx —
// same rule: only a real booking-lifecycle notification (has a bookingId)
// qualifies, and dismissing only hides the banner, never touches the booking.
export function TutorImportantUpdatesBanner() {
  const { notifications, dismiss } = useTutorNotifications();
  const alert = notifications.find((n) => n.category === "Booking" && n.bookingId && !n.dismissed);

  if (!alert) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ensena-ink">Booking update</p>
        <p className="mt-0.5 text-sm text-ensena-ink">{alert.text}</p>
        {alert.actionUrl && (
          <Link href={alert.actionUrl} className="mt-1.5 inline-block text-sm font-semibold text-ensena-primary hover:underline">
            View booking
          </Link>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismiss(alert.id)}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-amber-700 hover:bg-amber-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
