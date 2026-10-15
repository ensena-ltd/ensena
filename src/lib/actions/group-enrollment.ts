"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { quoteGroupEnrollment, recordGroupEnrollmentPaid } from "@/lib/group-payments-server";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { requestOrigin } from "@/lib/site-url-server";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

export interface GroupEnrollResult {
  ok: boolean;
  message?: string;
  redirectUrl?: string;
}

// "Pay" on the group-class review page. The price comes from the database,
// not the browser. With Paystack set up the student is sent to checkout and
// enrolled when the payment is confirmed; without it (test mode) they're
// enrolled straight away and no money is taken.
export async function enrollAndPayGroupClass(input: { cohortId: string; planId: string }): Promise<GroupEnrollResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in as a student to enroll.", redirectUrl: "/sign-in" };
  const { data: me } = await supabase.from("profiles").select("role, email").eq("id", user.id).maybeSingle();
  if (me?.role !== "student") return { ok: false, message: "Only student accounts can enroll in group classes." };
  if (!UUID.test(input.cohortId)) return { ok: false, message: "Please choose a cohort." };

  const quoted = await quoteGroupEnrollment(input.cohortId, input.planId);
  if (!quoted.ok) return { ok: false, message: quoted.message };
  const { quote } = quoted;
  if (quote.tutorId === user.id) return { ok: false, message: "You can't enroll in your own class." };

  const admin = getServiceRoleClient();
  const [{ data: existing }, { data: cohort }] = await Promise.all([
    admin.from("group_class_enrollments").select("id").eq("cohort_id", input.cohortId).eq("student_id", user.id).eq("status", "Active").maybeSingle(),
    admin.from("group_class_cohorts").select("seats_total, seats_filled").eq("id", input.cohortId).maybeSingle(),
  ]);
  if (existing) return { ok: false, message: "You're already enrolled in this class.", redirectUrl: `/student-dashboard/group-classes/${quote.classId}` };
  if (!cohort || Number(cohort.seats_filled) >= Number(cohort.seats_total)) return { ok: false, message: "This cohort just filled up. Please choose a different cohort." };

  if (isPaystackConfigured()) {
    const email = (me.email as string | null) || user.email;
    if (!email) return { ok: false, message: "Add an email address to your account to pay online." };
    try {
      const origin = await requestOrigin();
      const { authorizationUrl } = await initializeTransaction({
        email,
        amountNaira: quote.option.amount,
        reference: `GC-${randomBytes(6).toString("hex")}`.toUpperCase(),
        callbackUrl: `${origin}/student-dashboard/payments/callback`,
        metadata: { kind: "group", cohort_id: input.cohortId, plan: quote.option.id, student_id: user.id, class_id: quote.classId },
      });
      return { ok: true, redirectUrl: authorizationUrl };
    } catch (error) {
      console.error("Group class checkout failed", error);
      return { ok: false, message: "We couldn't start the payment. Please try again in a moment." };
    }
  }

  const reference = `TEST-${randomBytes(4).toString("hex").toUpperCase()}`;
  const paid = await recordGroupEnrollmentPaid({ studentId: user.id, quote, amountPaid: quote.option.amount, paidAt: new Date().toISOString(), provider: "test", reference });
  if (!paid.ok) return { ok: false, message: paid.message };
  revalidatePath("/student-dashboard", "layout");
  revalidatePath(`/group-classes/${quote.slug}`);
  return { ok: true, redirectUrl: `/group-classes/${quote.slug}/confirmation?enrollment=${paid.enrollmentId}` };
}
