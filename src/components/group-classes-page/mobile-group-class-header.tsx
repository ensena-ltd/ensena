"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart } from "lucide-react";

import { cn } from "@/lib/utils";

// Compact mobile-only header replacing the standard site Header on this
// checkout-style page (desktop keeps the real Header untouched — see
// page.tsx, which wraps each in its own breakpoint block). The heart is a
// local, non-persistent toggle — there's no "saved group classes" store in
// this app yet, unlike the shared saved-tutors one used elsewhere.
export function MobileGroupClassHeader() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

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
      <h1 className="font-heading text-base font-semibold text-ensena-ink">Group Class</h1>
      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved" : "Save class"}
        onClick={() => setSaved((v) => !v)}
        className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
      >
        <Heart className={cn("size-5", saved && "fill-ensena-primary text-ensena-primary")} />
      </button>
    </header>
  );
}
