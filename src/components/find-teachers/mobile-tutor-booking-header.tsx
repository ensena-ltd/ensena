"use client";

import Link from "next/link";
import { ChevronLeft, Heart } from "lucide-react";

import { useSavedTutor } from "@/hooks/use-saved-tutor";
import { cn } from "@/lib/utils";

// Compact mobile-only header for every render path of the tutor booking
// page (standard flow, pre-approved-offer flow, and its confirmation
// screen) — the site's full Header is hidden on mobile here (see page.tsx),
// so this is mounted at the top of each return path to keep back
// navigation and the real saved-tutor toggle available everywhere.
export function MobileTutorBookingHeader({ tutorSlug, title = "Book a session" }: { tutorSlug: string; title?: string }) {
  const [saved, toggleSaved] = useSavedTutor(tutorSlug);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ensena-border bg-ensena-surface px-2 lg:hidden">
      <Link
        href={`/find-teachers/${tutorSlug}`}
        aria-label="Back to tutor profile"
        className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
      >
        <ChevronLeft className="size-6" />
      </Link>
      <h1 className="font-heading text-base font-semibold text-ensena-ink">{title}</h1>
      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved" : "Save tutor"}
        onClick={toggleSaved}
        className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
      >
        <Heart className={cn("size-5", saved && "fill-ensena-primary text-ensena-primary")} />
      </button>
    </header>
  );
}
