import Image from "next/image";

import { cn } from "@/lib/utils";

// The one branded loading state — used by the root route loader
// (src/app/loading.tsx) and by any client-only resolve-on-mount gap (e.g.
// the classroom pages, which can't know a real booking exists until they've
// mounted in the browser — see private-classroom-page-client.tsx). Same
// visual identity everywhere a "the app is figuring out what to show" gap
// exists, instead of one page showing the logo and another showing plain
// text. The pulse/bar are both real Ensena colors, not a generic spinner.
export function BrandedLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-screen flex-col items-center justify-center gap-4 bg-white", className)}>
      <Image src="/brand/icon.svg" alt="Ensena" width={64} height={64} priority className="animate-pulse" />
      <p className="font-heading text-base font-semibold tracking-tight text-ensena-ink">ensena</p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-ensena-border">
        <div className="h-full w-1/3 animate-loading-bar rounded-full bg-ensena-primary" />
      </div>
    </div>
  );
}
