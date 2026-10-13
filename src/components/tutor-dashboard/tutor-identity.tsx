"use client";

import { createContext, useContext, type ReactNode } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeTutorStatus, tutorDocumentTypes, type TutorApplicationStatus, type TutorDocType } from "@/lib/tutor-application";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";

export { tutorDocumentTypes, type TutorDocType };

// Who is signed in to the tutor dashboard. Loaded server-side in the tutor
// layout from profiles + tutor_profiles (application_data = everything the
// sign-up wizard collected) + tutor_verification_documents. When Supabase
// isn't configured (demo mode) it falls back to the static demo tutor.

export interface TutorDocument {
  type: TutorDocType;
  fileName: string;
  storagePath: string;
  status: "submitted" | "approved" | "rejected";
  uploadedAt: string;
}

export interface TutorIdentity {
  id: string | null;
  name: string;
  firstName: string;
  email: string;
  phone: string;
  dob: string;
  image: string;
  joinedAt: string;
  applicationStatus: TutorApplicationStatus;
  rejectionReason: string | null;
  /** Items an admin asked the tutor to fix ("Resubmission Required"). */
  resubmissionFields: string[];
  headline: string;
  bio: string;
  country: string;
  stateCity: string;
  levels: string[];
  subjects: string[];
  exams: string[];
  yearsExperience: string;
  languages: string[];
  oneOnOnePrice: string;
  groupPrice: string;
  discoverySession: boolean;
  highestQualification: string;
  institution: string;
  fieldOfStudy: string;
  documents: TutorDocument[];
  /** The raw application_data, for saving back without losing other answers. */
  applicationData: Record<string, unknown>;
}

export interface TutorIdentityRow {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  applicationStatus: string;
  rejectionReason: string | null;
  resubmissionFields: string[];
  applicationData: Record<string, unknown>;
  documents: TutorDocument[];
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

type LevelExpertiseRow = { level?: unknown; items?: unknown; exams?: unknown };

function toIdentity(row: TutorIdentityRow): TutorIdentity {
  const app = row.applicationData ?? {};
  const expertise = (Array.isArray(app.levelExpertise) ? app.levelExpertise : []) as LevelExpertiseRow[];
  const name = row.fullName.trim() || row.email;
  return {
    id: row.id,
    name,
    firstName: name.split(" ")[0],
    email: row.email,
    phone: row.phone ?? "",
    dob: row.dateOfBirth ?? "",
    image: row.avatarUrl || "/teacher-1.jpg.png",
    joinedAt: row.createdAt,
    applicationStatus: normalizeTutorStatus(row.applicationStatus),
    rejectionReason: row.rejectionReason,
    resubmissionFields: row.resubmissionFields,
    headline: str(app.headline),
    bio: str(app.bio),
    country: str(app.country),
    stateCity: str(app.stateCity),
    levels: strList(app.levels),
    subjects: [...new Set(expertise.flatMap((e) => strList(e.items)))],
    exams: [...new Set(expertise.flatMap((e) => strList(e.exams)))],
    yearsExperience: str(app.yearsExperience),
    languages: strList(app.languagesSpoken),
    oneOnOnePrice: str(app.oneOnOnePrice),
    groupPrice: str(app.groupPrice),
    discoverySession: app.trialLessonEnabled === true,
    highestQualification: str(app.highestQualification),
    institution: str(app.gradInstitution),
    fieldOfStudy: str(app.gradFieldOfStudy),
    documents: row.documents,
    applicationData: app,
  };
}

const demoIdentity: TutorIdentity = {
  id: null,
  name: dashboardTutor.name,
  firstName: dashboardTutor.name.split(" ")[0],
  email: "",
  phone: "",
  dob: dashboardTutor.dob,
  image: dashboardTutor.image,
  joinedAt: "",
  applicationStatus: "approved",
  rejectionReason: null,
  resubmissionFields: [],
  headline: dashboardTutor.subjectTitle,
  bio: "",
  country: "Nigeria",
  stateCity: "",
  levels: [],
  subjects: [],
  exams: [],
  yearsExperience: "",
  languages: ["English"],
  oneOnOnePrice: "",
  groupPrice: "",
  discoverySession: true,
  highestQualification: "",
  institution: "",
  fieldOfStudy: "",
  documents: [],
  applicationData: {},
};

const TutorIdentityContext = createContext<TutorIdentity>(demoIdentity);

export function TutorIdentityProvider({ row, children }: { row: TutorIdentityRow | null; children: ReactNode }) {
  return <TutorIdentityContext.Provider value={row ? toIdentity(row) : demoIdentity}>{children}</TutorIdentityContext.Provider>;
}

export function useTutorIdentity() {
  return useContext(TutorIdentityContext);
}

export function isTutorVerified(t: TutorIdentity) {
  return t.applicationStatus === "approved";
}

// What an unverified tutor still has to provide before Ensena can review
// them — the "Tutor Information" and "Verification Documents" an admin sees.
export function verificationChecklist(t: TutorIdentity) {
  const hasDoc = (type: TutorDocType) => t.documents.some((d) => d.type === type && d.status !== "rejected");
  const info = [
    { label: "Full name", done: t.name.trim() !== "" && t.name !== t.email },
    { label: "Country", done: t.country !== "" },
    { label: "Academic levels", done: t.levels.length > 0 },
    { label: "Subjects", done: t.subjects.length > 0 },
    ...(t.levels.includes("Exams") ? [{ label: "Exam expertise", done: t.exams.length > 0 }] : []),
    { label: "Teaching experience", done: t.yearsExperience !== "" },
    { label: "Languages", done: t.languages.length > 0 },
    { label: "Pricing", done: t.oneOnOnePrice !== "" },
    { label: "Bio (at least 50 characters)", done: t.bio.trim().length >= 50 },
  ];
  const documents = tutorDocumentTypes.filter((d) => d.required).map((d) => ({ label: d.label, done: hasDoc(d.type) }));
  return { info, documents, complete: [...info, ...documents].every((i) => i.done) };
}

export function formatJoined(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// Saves Tutor Information: name on profiles, everything else merged into
// tutor_profiles.application_data (RLS lets a tutor update their own row but
// not their application_status). Callers router.refresh() afterwards.
export async function saveTutorInformation(
  t: TutorIdentity,
  changes: { fullName?: string; application?: Record<string, unknown> }
): Promise<{ error: string | null }> {
  if (!t.id) return { error: null };
  const supabase = getSupabaseBrowserClient();
  if (changes.fullName !== undefined) {
    const { error } = await supabase.from("profiles").update({ full_name: changes.fullName.trim() }).eq("id", t.id);
    if (error) return { error: "We couldn't save your name. Please try again." };
  }
  if (changes.application) {
    // Re-read so answers saved elsewhere since this page loaded aren't lost.
    const { data } = await supabase.from("tutor_profiles").select("application_data").eq("id", t.id).maybeSingle();
    const merged = { ...((data?.application_data as Record<string, unknown> | null) ?? t.applicationData), ...changes.application };
    const { error } = await supabase.from("tutor_profiles").update({ application_data: merged }).eq("id", t.id);
    if (error) return { error: "We couldn't save your tutor information. Please try again." };
  }
  return { error: null };
}
