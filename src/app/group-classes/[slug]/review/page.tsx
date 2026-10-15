import type { Metadata } from "next";
import { Suspense } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CheckoutHeader } from "@/components/booking/checkout-header";
import { getGroupClassBySlug } from "@/lib/group-classes-data";
import { loadGroupClassBySlug } from "@/lib/group-classes-server";
import { isPaystackConfigured } from "@/lib/paystack";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GroupClassReviewClient } from "./group-class-review-client";


export function generateMetadata(): Metadata {
  return { title: "Review & Payment | Ensena" };
}

// Not gated with notFound() — see the equivalent comment on
// /group-classes/[slug]/page.tsx: a real-submission class only exists in the
// browser's localStorage, invisible to this server render.
export default async function GroupClassReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const live = isSupabaseConfigured() ? await loadGroupClassBySlug(slug) : null;
  const cls = live ?? getGroupClassBySlug(slug) ?? null;
  // Real classes: prefill the student's own details.
  let student: { fullName: string; email: string; phone: string } | null = null;
  if (live) {
    const supabase = await getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data: person } = await supabase.from("profiles").select("full_name, email, phone").eq("id", auth.user.id).maybeSingle();
      student = { fullName: person?.full_name?.trim() || "", email: person?.email || auth.user.email || "", phone: ((person?.phone as string | null) ?? "").replace(/^\+?234\s*/, "").replace(/^0/, "") };
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="hidden lg:block">
        <Header logoSize={48} />
      </div>
      <CheckoutHeader />
      <main className="flex-1">
        <Suspense fallback={null}>
          <GroupClassReviewClient slug={slug} initialGroupClass={cls} student={student} testMode={!!live && !isPaystackConfigured()} />
        </Suspense>
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
