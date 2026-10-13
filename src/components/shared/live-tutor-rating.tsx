"use client";

import type { ReactNode } from "react";

import { useTutorRating } from "@/hooks/use-reviews";

// A render-prop wrapper so a rating can be kept live even inside a `.map()`
// loop over a list of tutors — calling useTutorRating() directly inside a
// loop body would violate the rules of hooks (each iteration would need its
// own hook call in a variable-length list), but a small component per list
// item is exactly what hooks are meant to support.
export function LiveTutorRating({
  name,
  rating,
  reviews,
  children,
}: {
  name: string;
  rating: number;
  reviews: number;
  children: (live: { rating: number; reviews: number }) => ReactNode;
}) {
  const live = useTutorRating(name, rating, reviews);
  return <>{children(live)}</>;
}
