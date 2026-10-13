import type { ReactNode } from "react";

import { GuardianDashboardSidebar } from "@/components/guardian-dashboard/guardian-dashboard-sidebar";
import { GuardianIdentityProvider, type GuardianChild, type GuardianIdentity } from "@/components/guardian-dashboard/guardian-identity";
import { requireRole } from "@/lib/supabase/require-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Same real, server-side gate as the other dashboards — a no-op until
// Supabase is configured, then confirms this is genuinely a signed-in
// "guardian" account before any of a child's academic info renders. The
// children come from student_guardians; RLS (private.is_guardian_of) only
// lets a guardian read the profiles of students linked to them.
export default async function GuardianDashboardLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("guardian");

  let identity: GuardianIdentity | null = null;
  if (profile) {
    const supabase = await getSupabaseServerClient();
    const [{ data: me }, { data: links }] = await Promise.all([
      supabase.from("profiles").select("phone").eq("id", profile.id).maybeSingle(),
      supabase
        .from("student_guardians")
        .select("student_id, relationship, consent_status, consented_at, created_at")
        .eq("guardian_user_id", profile.id)
        .order("created_at", { ascending: true }),
    ]);

    const studentIds = (links ?? []).map((l) => l.student_id);
    const [{ data: studentProfiles }, { data: learning }] = studentIds.length
      ? await Promise.all([
          supabase.from("profiles").select("id, full_name, email, phone, date_of_birth, avatar_url").in("id", studentIds),
          // "*" so share_progress_with_guardian is picked up once migration
          // 0016 has run (and nothing breaks before then).
          supabase.from("student_profiles").select("*").in("id", studentIds),
        ])
      : [{ data: [] }, { data: [] }];

    const childList: GuardianChild[] = (links ?? []).flatMap((link) => {
      const p = studentProfiles?.find((x) => x.id === link.student_id);
      if (!p) return [];
      const sp = learning?.find((x) => x.id === link.student_id);
      const name = p.full_name?.trim() || p.email;
      // The student's "Share Progress with Parent" setting: when off, their
      // learning plan and progress never leave the server.
      const shared = sp?.share_progress_with_guardian !== false;
      return [
        {
          id: p.id,
          name,
          firstName: name.split(" ")[0],
          email: p.email,
          phone: p.phone ?? sp?.phone ?? "",
          dob: p.date_of_birth ?? sp?.date_of_birth ?? "",
          image: p.avatar_url,
          learningFor: sp?.learning_for ?? "",
          academicLevel: sp?.academic_level ?? "",
          academicDetail: sp?.academic_detail ?? "",
          course: sp?.course ?? "",
          subjects: shared ? (sp?.subjects ?? []) : [],
          goal: shared ? (sp?.goal ?? "") : "",
          progressShared: shared,
          relationship: link.relationship,
          consentStatus: link.consent_status === "confirmed" ? "confirmed" : "pending",
          consentedAt: link.consented_at,
        },
      ];
    });

    identity = {
      isReal: true,
      name: profile.fullName,
      email: profile.email,
      phone: me?.phone ?? "",
      image: profile.avatarUrl,
      children: childList,
    };
  }

  return (
    <GuardianIdentityProvider identity={identity}>
      <div className="flex min-h-screen flex-col bg-ensena-bg-soft lg:flex-row">
        <GuardianDashboardSidebar />
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </GuardianIdentityProvider>
  );
}
