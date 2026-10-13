import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CounsellorBanner() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-ensena-border bg-ensena-bg-soft px-6 py-6 sm:flex-row sm:items-center sm:gap-6 sm:px-10 sm:py-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-ensena-primary shadow-sm">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <h2 className="font-heading text-xl font-semibold text-ensena-ink">
              Speak to a Counsellor
            </h2>
            <p className="mt-1 max-w-xl text-sm text-ensena-muted">
              Not sure where to start? Our academic counsellors will help you
              choose the right academic support and learning path.
            </p>
          </div>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/counsellor" />}
          className="h-12 w-full shrink-0 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary/90 sm:h-11 sm:w-auto"
        >
          Speak to a Counsellor
        </Button>
      </div>
    </section>
  );
}
