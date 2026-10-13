import type { ReactNode } from "react";

import { AccountStatusBanner } from "@/components/shared/account-status-banner";
import { DashboardSidebar } from "@/components/tutor-dashboard/dashboard-sidebar";
import { TutorBottomNav } from "@/components/tutor-dashboard/tutor-bottom-nav";
import { TutorIdentityProvider, type TutorDocument, type TutorIdentityRow } from "@/components/tutor-dashboard/tutor-identity";
import { TutorVerificationGate } from "@/components/tutor-dashboard/tutor-verification-gate";
import { accountIdForName } from "@/lib/account-status-store";
import { requireRole } from "@/lib/supabase/require-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";

// See the matching comment in student-dashboard's layout — no-ops until
// Supabase is configured, then becomes a real server-side gate. The tutor's
// real account (profiles), sign-up answers (tutor_profiles.application_data)
// and verification documents feed the whole dashboard via
// TutorIdentityProvider; TutorVerificationGate holds unverified tutors on
// the Verification page until they've submitted everything.
export default async function TutorDashboardLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("tutor");

  let identity: TutorIdentityRow | null = null;
  if (profile) {
    const supabase = await getSupabaseServerClient();
    const [{ data: account }, { data: tutor }, { data: documents }] = await Promise.all([
      supabase.from("profiles").select("phone, date_of_birth, created_at").eq("id", profile.id).maybeSingle(),
      supabase.from("tutor_profiles").select("phone, date_of_birth, application_status, application_data, rejection_reason, resubmission_fields").eq("id", profile.id).maybeSingle(),
      supabase.from("tutor_verification_documents").select("doc_type, file_name, storage_path, status, uploaded_at").eq("tutor_id", profile.id),
    ]);
    identity = {
      id: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      phone: account?.phone ?? tutor?.phone ?? null,
      dateOfBirth: account?.date_of_birth ?? tutor?.date_of_birth ?? null,
      createdAt: account?.created_at ?? "",
      applicationStatus: tutor?.application_status ?? "pending",
      rejectionReason: tutor?.rejection_reason ?? null,
      resubmissionFields: (tutor?.resubmission_fields as string[] | null) ?? [],
      applicationData: (tutor?.application_data as Record<string, unknown> | null) ?? {},
      documents: (documents ?? []).map(
        (d): TutorDocument => ({ type: d.doc_type, fileName: d.file_name, storagePath: d.storage_path, status: d.status, uploadedAt: d.uploaded_at })
      ),
    };
  }

  const tutorAccountId = accountIdForName("tutor", identity?.fullName ?? dashboardTutor.name);

  return (
    <TutorIdentityProvider row={identity}>
      <div className="flex min-h-screen flex-col bg-ensena-bg-soft lg:flex-row">
        <DashboardSidebar />
        <main className="min-w-0 flex-1 px-4 py-4 pb-20 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px]">
            {/* Always visible, on every tutor-dashboard page — a restriction
                should never be something a tutor only discovers mid-action. */}
            <AccountStatusBanner type="tutor" accountId={tutorAccountId} />
            <TutorVerificationGate>{children}</TutorVerificationGate>
          </div>
        </main>
        <TutorBottomNav />
      </div>
    </TutorIdentityProvider>
  );
}
