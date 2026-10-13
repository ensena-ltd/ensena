import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ClassroomRole } from "@/lib/classroom-data";

// The real entry-point block for a student who has not paid for this
// specific session — never just a disabled/hidden "Enter Class" button on
// the dashboard, which a student could bypass by navigating straight to the
// classroom URL. Only ever shown to role="student" (a tutor always has
// access to their own assigned class) — see ClassroomShell's own gate.
export function PaymentRequiredScreen({ leaveHref }: { role: ClassroomRole; leaveHref: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <Lock className="size-7" />
      </span>
      <div>
        <h1 className="font-heading text-xl font-semibold text-ensena-ink">Payment required</h1>
        <p className="mt-1 max-w-sm text-sm text-ensena-muted">
          You haven&apos;t paid for this session yet, so you can&apos;t enter the classroom. Complete payment from your dashboard to unlock it.
        </p>
      </div>
      <Button
        nativeButton={false}
        render={<Link href={leaveHref} />}
        className="h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white"
      >
        Back to My Classes
      </Button>
    </div>
  );
}
