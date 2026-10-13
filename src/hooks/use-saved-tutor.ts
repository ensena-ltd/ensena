"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getSavedTutorSlugs, isTutorSaved, SAVED_TUTORS_EVENT, toggleSavedTutor } from "@/lib/discovery-store";
import { requireAuthOrSaveDraft } from "@/lib/require-auth";

export function useSavedTutor(slug: string): [boolean, () => void] {
  const router = useRouter();
  // Deliberately not useSearchParams here — this hook is called from dozens
  // of card components across the site, most without a Suspense boundary;
  // usePathname/useRouter don't require one, useSearchParams does. A saved
  // tutor is a single click with nothing worth preserving across the
  // redirect, so a plain "come back to this page" via requireAuthOrSaveDraft
  // is enough — no draft/resume needed the way a multi-step booking has.
  const pathname = usePathname();
  // Always starts false so the server render and the client's hydration
  // pass match exactly (the server has no localStorage to check).
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // The real value is applied here, post-mount. This is the one
    // legitimate case for setState-in-effect: without it, a mismatched
    // "saved" boolean baked into the SSR HTML is an *attribute* mismatch,
    // which React leaves unpatched rather than self-healing (unlike
    // structural mismatches) — a previously-saved tutor's heart would stay
    // visually unfilled forever.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(isTutorSaved(slug));
    const onChange = () => setSaved(isTutorSaved(slug));
    window.addEventListener(SAVED_TUTORS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SAVED_TUTORS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [slug]);

  const toggle = useCallback(() => {
    const gate = requireAuthOrSaveDraft("save-tutor", { slug }, pathname || `/find-teachers/${slug}`);
    if (!gate.proceed) {
      router.push(gate.redirectUrl);
      return;
    }
    setSaved(toggleSavedTutor(slug));
  }, [slug, pathname, router]);

  return [saved, toggle];
}

// For pages that render the whole wishlist (e.g. Saved Tutors) rather than
// a single tutor's heart button — the full list of saved slugs, kept in
// sync with any tab/page that calls toggleSavedTutor.
export function useSavedTutorSlugs(): string[] {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlugs(getSavedTutorSlugs());
    const onChange = () => setSlugs(getSavedTutorSlugs());
    window.addEventListener(SAVED_TUTORS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SAVED_TUTORS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return slugs;
}
