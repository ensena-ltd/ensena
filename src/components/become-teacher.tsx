import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BecomeTeacher() {
  return (
    <section id="become-teacher">
      {/* Mobile: compact CTA banner, matching the app-style discovery feed. Desktop keeps the full section below unchanged. */}
      <div className="mx-4 my-4 flex items-center gap-3 rounded-2xl bg-ensena-primary/10 p-4 lg:hidden">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white">
          <GraduationCap className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ensena-ink">Become a Teacher on Ensena</p>
          <p className="text-xs text-ensena-muted">Share your knowledge, teach on your schedule and earn on your terms.</p>
        </div>
        <Button
          nativeButton={false}
          className="h-9 shrink-0 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary/90"
          render={<Link href="/become-a-tutor" />}
        >
          Start Teaching
        </Button>
      </div>

      {/* No photo — the message alone carries the section instead of an
          icon-card grid or a stock teacher photo.
          Desktop: a full-bleed background band, same idiom the footer
          immediately below it already uses (full-width color, centered
          max-w-[1240px] content inside) — so their left/right edges line up
          exactly, instead of this section's background sitting inset in a
          narrower rounded card. */}
      <div className="hidden bg-ensena-bg-soft py-20 lg:block">
        <div className="mx-auto flex max-w-[1240px] justify-center px-8">
          <div className="max-w-xl text-center">
            <h2 className="font-heading text-3xl font-semibold leading-tight text-ensena-ink lg:text-4xl">
              Share what you know.
            </h2>
            <p className="mt-4 text-ensena-muted">
              Share your knowledge with students across Nigeria and beyond.
            </p>

            <Button
              className="mt-10 h-12 rounded-full bg-ensena-primary px-8 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-[var(--ensena-primary-hover)]"
              nativeButton={false}
              render={<Link href="/become-a-tutor" />}
            >
              Start Teaching
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
