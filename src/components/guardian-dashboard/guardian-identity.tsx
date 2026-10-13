"use client";

import { createContext, useContext, type ReactNode } from "react";

import { guardianProfile, linkedChildren } from "@/lib/guardian-dashboard-data";

// Who is signed in to the guardian dashboard, and the children linked to
// them (student_guardians -> profiles + student_profiles). Loaded
// server-side in the guardian layout; when Supabase isn't configured (demo
// mode) it falls back to the static demo guardian/child.

export interface GuardianChild {
  id: string;
  name: string;
  firstName: string;
  email: string;
  phone: string;
  dob: string;
  image: string | null;
  learningFor: string;
  academicLevel: string;
  academicDetail: string;
  course: string;
  subjects: string[];
  goal: string;
  /** False when the student turned off "Share Progress with Parent" — the
   *  learning plan / progress fields are then left empty server-side. */
  progressShared: boolean;
  relationship: string;
  consentStatus: "pending" | "confirmed";
  consentedAt: string | null;
}

export interface GuardianIdentity {
  /** False in demo mode — pages keep their demo lessons/payments then. */
  isReal: boolean;
  name: string;
  email: string;
  phone: string;
  image: string | null;
  children: GuardianChild[];
}

const demoIdentity: GuardianIdentity = {
  isReal: false,
  name: guardianProfile.name,
  email: "",
  phone: "",
  image: guardianProfile.image,
  children: linkedChildren.map((c) => ({
    id: c.id,
    name: c.name,
    firstName: c.name.split(" ")[0],
    email: "",
    phone: "",
    dob: "",
    image: c.image,
    learningFor: "My child",
    academicLevel: c.level,
    academicDetail: "",
    course: "",
    subjects: [],
    goal: "",
    progressShared: true,
    relationship: "Parent",
    consentStatus: "confirmed",
    consentedAt: null,
  })),
};

const GuardianIdentityContext = createContext<GuardianIdentity>(demoIdentity);

export function GuardianIdentityProvider({ identity, children }: { identity: GuardianIdentity | null; children: ReactNode }) {
  return <GuardianIdentityContext.Provider value={identity ?? demoIdentity}>{children}</GuardianIdentityContext.Provider>;
}

export function useGuardianIdentity() {
  return useContext(GuardianIdentityContext);
}

export function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** "SS2", "300 Level · Computer Science", "Primary" … */
export function childLevelLabel(child: GuardianChild) {
  return [child.academicDetail || child.academicLevel, child.course].filter(Boolean).join(" · ");
}
