import Link from "next/link";
import { HeartHandshake } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NeedHelpChoosingCard() {
  return (
    <div className="rounded-2xl border border-ensena-border bg-[#CBEFFF]/30 p-5">
      <p className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
        <HeartHandshake className="size-4.5 text-[#2F9BE0]" /> Need help choosing?
      </p>
      <p className="mt-1.5 text-sm text-ensena-muted">
        Speak to an Ensena Academic Counsellor. They can review your Discovery Session, your tutor&apos;s recommendation and your learning plan, then help you choose the best path forward, including recommending a different tutor if needed.
      </p>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href="/counsellor" />}
        className="mt-3 h-10 rounded-full border-ensena-border bg-ensena-surface px-5 text-sm font-semibold text-ensena-ink"
      >
        Book Counselling Session
      </Button>
    </div>
  );
}
