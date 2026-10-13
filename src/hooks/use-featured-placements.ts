"use client";

import { useSyncExternalStore } from "react";

import {
  featuredGroupClassSlots,
  featuredTutorSlots,
  type FeaturedGroupClassSlot,
  type FeaturedTutorSlot,
} from "@/lib/admin-promotions-data";
import { getFeaturedGroupClasses, getFeaturedTutors, subscribeFeaturedPlacements } from "@/lib/admin-promotions-store";

// Pinned to the pristine seed, not re-read from localStorage — matches
// exactly what the server rendered, so the first client render doesn't
// disagree with it (see use-lesson-confirmations.ts's identical reasoning).
function getServerTutors(): FeaturedTutorSlot[] {
  return featuredTutorSlots;
}
function getServerClasses(): FeaturedGroupClassSlot[] {
  return featuredGroupClassSlots;
}

export function useFeaturedTutors(): FeaturedTutorSlot[] {
  return useSyncExternalStore(subscribeFeaturedPlacements, getFeaturedTutors, getServerTutors);
}

export function useFeaturedGroupClasses(): FeaturedGroupClassSlot[] {
  return useSyncExternalStore(subscribeFeaturedPlacements, getFeaturedGroupClasses, getServerClasses);
}
