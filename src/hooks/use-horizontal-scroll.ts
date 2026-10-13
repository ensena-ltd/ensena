"use client";

import { useRef } from "react";

export function useHorizontalScroll(step = 280) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return { scrollerRef, scrollBy };
}
