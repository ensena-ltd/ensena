import Link from "next/link";

import { Button } from "@/components/ui/button";

export function TutorFinalCta() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-ensena-ink px-6 py-16 text-center sm:px-12">
        <h2 className="font-heading text-3xl font-semibold text-white lg:text-4xl">
          Your knowledge can take someone further.
        </h2>
        <p className="mt-3 text-white/70">Become a tutor on Ensena.</p>

        <Button
          nativeButton={false}
          className="mt-8 h-12 rounded-full bg-ensena-primary px-8 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary/90"
          render={<Link href="/sign-up/tutor" />}
        >
          Create Your Tutor Profile
        </Button>

        <p className="mt-4 text-xs text-white/50">
          Create your profile and start building your teaching presence on Ensena.
        </p>
      </div>
    </section>
  );
}
