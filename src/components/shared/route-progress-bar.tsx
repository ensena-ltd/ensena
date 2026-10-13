"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// A minimal top-of-page progress indicator for client-side navigation — Next
// App Router navigations don't reload the page, so there's normally zero
// feedback between "clicked a link" and "new route painted." This renders a
// thin bar that grows toward (never reaching) full width while a navigation
// is in flight, then snaps to 100% and fades out the instant the new route's
// pathname actually changes. Pure transform/opacity (no width animation,
// which would trigger layout) and skipped entirely under
// prefers-reduced-motion via globals.css's global transition-duration
// override.
export function RouteProgressBar() {
  // Pathname only — deliberately not useSearchParams(), which requires a
  // Suspense boundary and (confirmed live, via a real click-through) can
  // remount this component mid-navigation: the remount re-initializes
  // lastKeyRef to the DESTINATION path before the effect ever runs, so the
  // "did the route change" check is always false and the bar never shows.
  // usePathname() alone needs no Suspense wrapper and never remounts this
  // way — the same signal use-page-view-tracking.ts already established as
  // this app's canonical "a real navigation happened" trigger.
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const lastKeyRef = useRef(pathname);

  useEffect(() => {
    if (lastKeyRef.current === pathname) return;
    lastKeyRef.current = pathname;
    // The route has already changed by the time this effect runs (App
    // Router navigation is a single commit, not a multi-phase load this
    // component can observe mid-flight) — so this plays a quick,
    // intentionally brief "arrived" pulse rather than a real 0->90% loading
    // ramp, which would be lying about a request that already finished.
    setVisible(true);
    setProgress(100);
    const hide = window.setTimeout(() => setVisible(false), 220);
    const reset = window.setTimeout(() => setProgress(0), 420);
    return () => {
      clearTimeout(hide);
      clearTimeout(reset);
    };
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      className={cnBar(visible)}
      style={{ transform: `scaleX(${progress / 100})` }}
    />
  );
}

function cnBar(visible: boolean): string {
  return [
    "pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 origin-left bg-ensena-primary transition-[transform,opacity] duration-200 ease-out",
    visible ? "opacity-100" : "opacity-0",
  ].join(" ");
}
