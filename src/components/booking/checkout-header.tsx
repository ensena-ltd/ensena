"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/logo";

// Shared checkout-style header for the review/payment pages (mobile only —
// desktop keeps the site's real Header via each route's page.tsx). Distinct
// from the booking pages' own mobile headers: this one shows the Ensena
// logo instead of a page title, plus a small "Secure checkout" mark,
// matching the reference checkout design.
export function CheckoutHeader() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ensena-border bg-ensena-surface px-4 lg:hidden">
      <button
        type="button"
        aria-label="Go back"
        onClick={() => router.back()}
        className="flex size-9 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
      >
        <ChevronLeft className="size-6" />
      </button>
      <Link href="/" className="flex items-center gap-1.5">
        <Logo size={26} />
      </Link>
      <span className="flex items-center gap-1 text-xs font-medium text-ensena-muted">
        <ShieldCheck className="size-3.5" /> Secure checkout
      </span>
    </header>
  );
}
