// Data helpers for the Tutor Verification workspace (queue + full-page
// review). Cross-references the existing tutor records instead of inventing
// a parallel dataset: initialAdminTutors (status/verification/subjects),
// tutorListings (public profile fields — levels, languages, pricing), and
// tutorProfiles (richer per-tutor detail — bio, documents with real
// submitted dates, education, experience).
import { formatTutorId } from "@/lib/admin-user-profile-data";
import { initialAdminTutors, type AdminTutor } from "@/lib/admin-data";
import { tutorProfiles, type VerificationDocuments } from "@/lib/admin-tutor-profile-data";
import { tutorListings } from "@/lib/tutors";

export interface VerificationTutorRow {
  id: string;
  tutorId: string;
  name: string;
  email: string;
  image: string;
  subjects: string[];
  examExpertise: string;
  academicLevels: string;
  languages: string[];
  experienceYears: number;
  pricePerHour: number;
  discoverySessionAvailable: boolean;
  submittedLabel: string;
  documents: VerificationDocuments;
  bio: string;
}

const examKeywords = ["WAEC", "JAMB", "NECO", "UTME"];

export function verificationRowFor(tutor: AdminTutor): VerificationTutorRow {
  const marketplace = tutorListings.find((t) => t.name === tutor.name);
  const profile = tutorProfiles[tutor.id];
  const levels = marketplace?.levels ?? [];
  return {
    id: tutor.id,
    tutorId: formatTutorId(tutor.id),
    name: tutor.name,
    email: tutor.email,
    image: profile?.image ?? "/teacher-1.jpg.png",
    subjects: tutor.subjects,
    examExpertise: levels.filter((l) => examKeywords.some((k) => l.includes(k))).join(" / ") || "—",
    academicLevels: levels.filter((l) => !examKeywords.some((k) => l.includes(k))).join(", ") || "—",
    languages: profile?.languages ?? marketplace?.languages ?? ["English"],
    experienceYears: profile?.experienceYears ?? marketplace?.yearsExperience ?? 0,
    pricePerHour: profile?.hourlyRate ?? marketplace?.price ?? 0,
    discoverySessionAvailable: marketplace?.availableToday ?? false,
    submittedLabel: profile?.verificationDocuments.idDocument.submittedAt ?? tutor.joined,
    documents: profile?.verificationDocuments ?? {
      idDocument: { submitted: false },
      qualifications: { submitted: false },
      certificates: { submitted: false },
      teachingVideo: { submitted: false },
    },
    bio: profile?.bio ?? "No bio on file yet.",
  };
}

export const verificationChecklistItems = (row: VerificationTutorRow) => [
  { label: "Identity document submitted", done: row.documents.idDocument.submitted },
  { label: "Academic qualification submitted", done: row.documents.qualifications.submitted },
  { label: "Teaching qualification submitted", done: row.documents.certificates.submitted },
  { label: "Profile information complete", done: row.subjects.length > 0 && row.experienceYears > 0 },
];

// Platform-scale summary for the Analytics dashboard's Tutor Verification
// widget — a real base count from the current tutor roster, scaled up with
// the same curated-offset convention used elsewhere in this app (e.g.
// admin-counselling-center-data.ts's pendingRequests) so a handful of demo
// tutors can still stand in for a plausible full verification backlog.
export const tutorVerificationSummaryStats = {
  pending: initialAdminTutors.filter((t) => t.verification === "Pending").length + 11,
  approvedThisMonth: initialAdminTutors.filter((t) => t.verification === "Verified").length + 13,
  rejected: initialAdminTutors.filter((t) => t.verification === "Rejected").length + 2,
  resubmissionRequired: initialAdminTutors.filter((t) => t.verification === "Resubmission Required").length + 3,
};
