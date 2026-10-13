"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronLeft, Heart } from "lucide-react";

// Mobile-only compact page header for /find-teachers, replacing the
// standard site Header (logo + hamburger) on small screens — the desktop
// Header is left completely untouched and still renders as-is above `lg`
// (see page.tsx, which wraps each in its own breakpoint block). Icon
// destinations match the ones Header's "icons" variant and MobileBottomNav
// already use elsewhere in the app.
export function MobileSearchHeader() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ensena-border bg-ensena-surface px-2 lg:hidden">
      <button
        type="button"
        aria-label="Go back"
        onClick={() => router.back()}
        className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
      >
        <ChevronLeft className="size-6" />
      </button>

      <h1 className="font-heading text-base font-semibold text-ensena-ink">Find a Tutor</h1>

      <div className="flex items-center gap-1">
        <Link
          href="/student-dashboard/saved-tutors"
          aria-label="Saved tutors"
          className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <Heart className="size-5" />
        </Link>
        <Link
          href="/student-dashboard/notifications"
          aria-label="Notifications"
          className="relative flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <Bell className="size-5" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-ensena-primary" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
