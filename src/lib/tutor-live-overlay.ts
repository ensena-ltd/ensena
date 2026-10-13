"use client";

// Overlays the tutor's own live-edited Public Profile (my-profile-client.tsx
// / tutor-public-profile-store.ts) on top of the static seed TutorListing —
// shared by BOTH the tutor's own profile page (tutor-profile-client.tsx)
// AND the general marketplace listing (find-teachers-client.tsx /
// find-a-tutor-client.tsx), so a teacher's saved changes actually reach
// search/filter results, not just their own profile view. Before this,
// editing supportTypes/academicSpecialization/academicLevels in the
// dashboard only ever showed up on the tutor's own profile page — the
// shared `tutorListings` array everything else searches/filters never saw
// it, so Find Tutor's filters could never actually match a teacher's live
// declarations.
//
// Only bio/years/price/photo/supportTypes/academicSpecialization/levels are
// merged — tutor.subject stays untouched (a single required string used
// throughout tutor-profile-client.tsx's copy/logic) and tutor.languages
// stays untouched (a restricted union type), so folding the editor's
// free-text multi-value data into either would risk breaking this page (and
// every other tutor's) rather than just this one tutor's profile. `levels`
// IS safe to override: it's already a plain string[] drawn from the exact
// same 8-option taxonomy the editor's Academic Levels chips use, with no
// analogous narrowing risk. No-op for every tutor except the logged-in
// dashboard tutor's own slug.
import { useMemo } from "react";

import { useTutorPublicProfile } from "@/hooks/use-tutor-public-profile";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";
import type { TutorPublicProfileData } from "@/lib/tutor-public-profile-store";
import { tutorListings, type TutorListing } from "@/lib/tutors";

export function applyLiveProfileOverride(tutor: TutorListing, liveProfile: TutorPublicProfileData): TutorListing {
  if (tutor.slug !== dashboardTutor.slug) return tutor;
  return {
    ...tutor,
    bio: liveProfile.bio,
    yearsExperience: liveProfile.teachingExperienceYears,
    price: liveProfile.hourlyRate,
    image: liveProfile.photoUrl ?? tutor.image,
    supportTypes: liveProfile.supportTypes,
    academicSpecialization: liveProfile.academicSpecialization,
    levels: liveProfile.academicLevels.length > 0 ? liveProfile.academicLevels : tutor.levels,
  };
}

export function useLiveTutorOverride(tutor: TutorListing): TutorListing {
  const liveProfile = useTutorPublicProfile();
  return applyLiveProfileOverride(tutor, liveProfile);
}

// The full marketplace listing, with the dashboard tutor's one entry kept
// in sync with their live saved profile — this is what Find Tutor's search/
// filter/sort should read instead of the raw static `tutorListings` import.
export function useLiveTutorListings(): TutorListing[] {
  const liveProfile = useTutorPublicProfile();
  return useMemo(
    () => tutorListings.map((t) => applyLiveProfileOverride(t, liveProfile)),
    [liveProfile]
  );
}
