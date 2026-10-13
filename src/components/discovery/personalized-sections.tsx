"use client";

import { useEffect, useState } from "react";

import { TeacherSection } from "@/components/teacher-section";
import {
  RECENTLY_VIEWED_EVENT,
  SAVED_TUTORS_EVENT,
  getRecentlyViewedSlugs,
  getSavedTutorSlugs,
} from "@/lib/discovery-store";
import { getRelatedSubjectTutors, getTrendingTutors, getTutorBySlug, tutorToTeacher, type TutorListing } from "@/lib/tutors";

const DEFAULT_ANCHOR_SUBJECT = "Mathematics";

// This app has no real login/session state (see demo-auth.ts), so
// "personalization" here is driven by real localStorage signal (what this
// browser actually viewed/saved) rather than a fabricated user profile.
// Recently Viewed / Saved / Because You Viewed hide themselves entirely
// when there's no signal, instead of showing empty or fake content.
export function PersonalizedSections() {
  // Both start empty so the server render and the client's hydration pass
  // match exactly (the server has no localStorage to check) — otherwise the
  // history-dependent sections appear/disappear between server and client
  // output, a *structural* mismatch that forces React to discard and
  // client-regenerate this whole subtree on every load (visible as a
  // console error). The real values are applied in a post-mount effect,
  // which is a normal client-only re-render, not a hydration mismatch.
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => {
      setRecentSlugs(getRecentlyViewedSlugs(10));
      setSavedSlugs(getSavedTutorSlugs());
    };
    sync();
    window.addEventListener(RECENTLY_VIEWED_EVENT, sync);
    window.addEventListener(SAVED_TUTORS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(RECENTLY_VIEWED_EVENT, sync);
      window.removeEventListener(SAVED_TUTORS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isTutor = (t: TutorListing | undefined): t is TutorListing => t !== undefined;
  const recentTutors = recentSlugs.map((slug) => getTutorBySlug(slug)).filter(isTutor);
  const savedTutors = savedSlugs.map((slug) => getTutorBySlug(slug)).filter(isTutor);
  const anchorTutor = recentTutors[0];
  const anchorSubject = anchorTutor?.subject ?? DEFAULT_ANCHOR_SUBJECT;

  const becauseYouViewedTutors = anchorTutor
    ? getRelatedSubjectTutors(anchorTutor.subject, anchorTutor.slug)
    : [];
  const studentsAlsoExploredTutors = getRelatedSubjectTutors(anchorSubject, anchorTutor?.slug);

  return (
    // A real (non-Fragment) wrapper — this component sits among ~20 other
    // unkeyed <TeacherSection> siblings in page.tsx, and conditionally
    // adding/removing children directly at that level made reconciliation
    // unreliable in dev. Isolating this component's own children inside one
    // stable node keeps the outer sibling list's child count constant.
    <div>
      <TeacherSection
        title="Continue Exploring"
        subtitle="Pick up where you left off."
        teachers={recentTutors.map(tutorToTeacher)}
        viewAllLabel="View all"
      />
      <TeacherSection
        title="Your Saved Teachers"
        subtitle="Teachers you've bookmarked."
        teachers={savedTutors.map(tutorToTeacher)}
        viewAllLabel="View all"
        viewAllHref="/student-dashboard/saved-tutors"
      />
      {anchorTutor && (
        <TeacherSection
          title={`Because you viewed ${anchorSubject} tutors`}
          teachers={becauseYouViewedTutors.map(tutorToTeacher)}
          viewAllLabel="View all"
          viewAllHref={`/find-teachers?subject=${encodeURIComponent(anchorSubject)}`}
        />
      )}
      <TeacherSection
        title="Students Also Explored"
        subtitle="Popular next steps for learners like you."
        teachers={studentsAlsoExploredTutors.map(tutorToTeacher)}
        viewAllLabel="View all"
      />
      <TeacherSection
        title="Trending on Ensena"
        subtitle="Teachers getting a lot of interest this week."
        teachers={getTrendingTutors().map(tutorToTeacher)}
        badge="Trending"
        viewAllLabel="View all"
      />
    </div>
  );
}
