"use client";

import { useMemo } from "react";

import { useGroupClassSubmissions } from "@/hooks/use-group-class-submissions";
import { submissionToGroupClassListing } from "@/lib/group-class-submission-store";
import { groupClassListings, type GroupClassListing } from "@/lib/group-classes-data";
import { getSimilarLiveGroupClasses } from "@/lib/group-classes-live-data";

export function useGroupClassListings(): GroupClassListing[] {
  const submissions = useGroupClassSubmissions();
  return useMemo(() => {
    const approved = submissions
      .map(submissionToGroupClassListing)
      .filter((c): c is GroupClassListing => c !== null);
    return [...groupClassListings, ...approved];
  }, [submissions]);
}

export function useGroupClassBySlug(slug: string): GroupClassListing | undefined {
  const listings = useGroupClassListings();
  return useMemo(() => listings.find((c) => c.slug === slug), [listings, slug]);
}

export { getSimilarLiveGroupClasses };
