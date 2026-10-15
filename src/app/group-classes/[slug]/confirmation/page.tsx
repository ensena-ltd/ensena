import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getGroupClassBySlug } from "@/lib/group-classes-data";
import { loadGroupClassBySlug, parseSchedule } from "@/lib/group-classes-server";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GroupClassConfirmationClient, type ConfirmedEnrollment } from "./group-class-confirmation-client";

export function generateMetadata(): Metadata {
  return { title: "Enrollment Confirmed | Ensena" };
}

const UUID = /^[0-9a-f-]{36}$/i;

// Real classes show the student's actual enrollment (?enrollment=<id>);
// demo classes keep reading their details from the URL.
export default async function GroupClassConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enrollment?: string }>;
}) {
  const { slug } = await params;
  const { enrollment: enrollmentId } = await searchParams;
  const live = isSupabaseConfigured() ? await loadGroupClassBySlug(slug) : null;
  let confirmed: ConfirmedEnrollment | null = null;

  if (live) {
    if (!enrollmentId || !UUID.test(enrollmentId)) redirect(`/group-classes/${slug}`);
    const { data: auth } = await (await getSupabaseServerClient()).auth.getUser();
    if (!auth.user) redirect("/sign-in");
    const admin = getServiceRoleClient();
    const { data: enrollment } = await admin.from("group_class_enrollments").select("id, booking_reference, cohort_id, plan, status").eq("id", enrollmentId).eq("student_id", auth.user.id).maybeSingle();
    if (!enrollment) redirect(`/group-classes/${slug}`);
    const [{ data: cohort }, { data: plan }, { data: sessions }, { data: subscription }] = await Promise.all([
      admin.from("group_class_cohorts").select("id, group_class_id, start_date, schedule").eq("id", enrollment.cohort_id).maybeSingle(),
      admin.from("payment_plans").select("amount, scope, mode").eq("booking_id", enrollment.id).order("created_at").limit(1).maybeSingle(),
      admin.from("group_class_sessions").select("id, scheduled_at").eq("cohort_id", enrollment.cohort_id).neq("status", "Cancelled").order("scheduled_at"),
      admin.from("subscriptions").select("next_charge_at").eq("booking_id", enrollment.id).eq("status", "active").maybeSingle(),
    ]);
    if (!cohort || cohort.group_class_id !== live.live!.id) redirect(`/group-classes/${slug}`);
    const duration = parseSchedule(cohort.schedule).durationMinutes;
    const cohortIndex = Math.max(0, live.cohorts.findIndex((c) => c.id === cohort.id));
    confirmed = {
      reference: enrollment.booking_reference as string,
      planId: (enrollment.plan as string | null) ?? "full",
      cohortIndex,
      totalPaid: Number(plan?.amount ?? 0),
      nextChargeMs: subscription?.next_charge_at ? new Date(subscription.next_charge_at as string).getTime() : null,
      sessions: ((sessions ?? []) as { id: string; scheduled_at: string }[]).map((s) => {
        const startMs = new Date(s.scheduled_at).getTime();
        return { id: s.id, startMs, endMs: startMs + duration * 60_000 };
      }),
    };
  }
  const cls = live ?? getGroupClassBySlug(slug) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="hidden lg:block">
        <Header logoSize={48} />
      </div>
      <main className="flex-1">
        <Suspense fallback={null}>
          <GroupClassConfirmationClient slug={slug} initialGroupClass={cls} confirmed={confirmed} />
        </Suspense>
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
