import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Browser Data Too Large | Ensena",
  robots: { index: false },
};

// Only reached when src/proxy.ts already tried to clear cookies Ensena
// doesn't use and the browser is still sending too many (some cookies can't
// be removed by another site). Ensena's own sign-in is never cleared, so
// the visitor isn't signed out by any of this.
export default function SessionResetPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ensena-bg-soft px-6 py-14">
      <Link href="/" aria-label="Ensena home" className="mb-8">
        <Logo size={48} />
      </Link>

      <div className="w-full max-w-md rounded-3xl border border-ensena-border bg-ensena-surface p-6 shadow-[0_20px_60px_-30px_rgba(17,24,39,0.25)] sm:p-8">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="mt-4 text-center font-heading text-xl font-semibold text-ensena-ink">Your browser needs a quick clean-up</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-ensena-muted">
          Your browser is holding on to a lot of saved data from other websites, and some of it can&apos;t be removed by Ensena. Clearing it
          takes a few seconds:
        </p>

        <ol className="mt-4 flex flex-col gap-2 text-sm text-ensena-ink">
          <li className="flex gap-2"><span className="font-semibold text-ensena-primary">1.</span> Click the icon to the left of the web address at the top of your browser.</li>
          <li className="flex gap-2"><span className="font-semibold text-ensena-primary">2.</span> Choose <strong>Cookies and site data</strong> (or <strong>Site settings</strong>).</li>
          <li className="flex gap-2"><span className="font-semibold text-ensena-primary">3.</span> Delete the saved data for this site, then come back and reload.</li>
        </ol>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button nativeButton={false} render={<Link href="/sign-in" />} className="h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            Try again
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/contact" />} className="h-11 w-full rounded-full border-ensena-border text-sm font-medium">
            Still having trouble? Contact us
          </Button>
        </div>
      </div>
    </div>
  );
}
