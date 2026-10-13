"use client";

import { useSyncExternalStore } from "react";

import { getTutorPublicProfile, subscribeTutorPublicProfile, type TutorPublicProfileData } from "@/lib/tutor-public-profile-store";

export function useTutorPublicProfile(): TutorPublicProfileData {
  // getTutorPublicProfile() returns the same seed object reference on the
  // server (window undefined) every call, so it's already a stable
  // snapshot — no separate getServerSnapshot needed.
  return useSyncExternalStore(subscribeTutorPublicProfile, getTutorPublicProfile, getTutorPublicProfile);
}
