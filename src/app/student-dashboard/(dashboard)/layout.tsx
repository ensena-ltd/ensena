import type { ReactNode } from "react";

import { AccountStatusBanner } from "@/components/shared/account-status-banner";
import { ThemeSync } from "@/components/shared/theme-sync";
import { getAccountSettings, type ThemePreference } from "@/lib/account-settings";
import { StudentBottomNav } from "@/components/student-dashboard/student-bottom-nav";
import { StudentIdentityProvider, type StudentIdentityRow } from "@/components/student-dashboard/student-identity";
import { StudentMobileTopbar } from "@/components/student-dashboard/student-mobile-topbar";
import { StudentSidebar } from "@/components/student-dashboard/student-sidebar";
import { accountIdForName } from "@/lib/account-status-store";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { requireRole } from "@/lib/supabase/require-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// requireRole() is a no-op (returns null) until a real Supabase project is
// configured — see src/lib/supabase/env.ts — so this stays a real
// server-side gate without breaking the existing demo sign-in during the
// migration. Once configured, an unauthenticated visitor or a tutor/admin
// account is redirected before any student-only content ever renders.
export default async function StudentDashboardLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("student");

  let identity: StudentIdentityRow | null = null;
  let accountTheme: ThemePreference | null = null;
  if (profile) {
    const supabase = await getSupabaseServerClient();
    const [{ data: contact }, { data: student }, { data: guardian }, settings, { data: inbox }] = await Promise.all([
      supabase.from("profiles").select("phone, date_of_birth").eq("id", profile.id).maybeSingle(),
      // "*" so newer columns (bio, support_types, learning_goals) are picked
      // up when present without breaking before the migration has run.
      supabase.from("student_profiles").select("*").eq("id", profile.id).maybeSingle(),
      supabase.from("student_guardians").select("full_name, relationship, email, phone, consent_status").eq("student_id", profile.id).maybeSingle(),
      getAccountSettings(profile.id),
      supabase.from("conversation_participants").select("unread_count").eq("user_id", profile.id).eq("archived", false),
    ]);
    accountTheme = settings.saved ? settings.theme : null;
    identity = {
      id: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      phone: contact?.phone ?? student?.phone ?? null,
      dateOfBirth: contact?.date_of_birth ?? student?.date_of_birth ?? null,
      learningFor: student?.learning_for ?? null,
      academicLevel: student?.academic_level ?? null,
      academicDetail: student?.academic_detail ?? null,
      course: student?.course ?? null,
      subjects: student?.subjects ?? null,
      goal: student?.goal ?? null,
      bio: (student?.bio as string | null | undefined) ?? null,
      supportTypes: (student?.support_types as string[] | null | undefined) ?? null,
      learningGoals: (student?.learning_goals as string[] | null | undefined) ?? null,
      guardian: guardian
        ? {
            fullName: guardian.full_name,
            relationship: guardian.relationship,
            email: guardian.email,
            phone: guardian.phone,
            consentStatus: guardian.consent_status === "confirmed" ? "confirmed" : "pending",
          }
        : null,
      unreadMessages: ((inbox ?? []) as { unread_count: number }[]).reduce((n, r) => n + (r.unread_count ?? 0), 0),
    };
  }

  const studentAccountId = accountIdForName("student", identity?.fullName ?? dashboardStudent.name);

  return (
    <StudentIdentityProvider row={identity}>
      <ThemeSync accountTheme={accountTheme} />
      <div className="flex min-h-screen flex-col bg-ensena-bg-soft lg:flex-row">
        <StudentSidebar />
        <StudentMobileTopbar />
        <main className="min-w-0 flex-1 px-4 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px]">
            {/* Always visible, on every student-dashboard page — same
                reasoning as the tutor layout's banner. */}
            <AccountStatusBanner type="student" accountId={studentAccountId} />
            {children}
          </div>
        </main>
        <StudentBottomNav />
      </div>
    </StudentIdentityProvider>
  );
}
