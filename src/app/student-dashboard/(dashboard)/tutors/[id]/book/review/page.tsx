import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ReviewBookingReal } from "@/components/student-dashboard/live/review-booking-real";
import { dayOfWeekISO, parseISODate, type BookingFrequency } from "@/lib/booking-slots";
import { isPaystackConfigured } from "@/lib/paystack";
import { getPlatformTodayParts, getPlatformNowMs } from "@/lib/platform-time";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorProfile } from "@/lib/tutor-directory-server";

export const metadata: Metadata = {
  title: "Review your booking | Ensena Student Dashboard",
};

type Search = { subject?: string; duration?: string; frequency?: string; days?: string; start?: string; time?: string };

// Nothing is saved until the student presses Pay — this page only shows what
// the booking page chose, after checking it still fits the tutor's settings.
export default async function ReviewBookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) redirect("/student-dashboard/find-a-tutor");
  const profile = await requireRole("student");
  if (!profile) redirect("/sign-in");
  const tutor = await loadTutorProfile(id);
  if (!tutor) notFound();
  const bookHref = `/student-dashboard/tutors/${id}/book`;
  if (!tutor.pricePerHour || tutor.onVacation) redirect(`/student-dashboard/tutors/${id}`);

  const q = await searchParams;
  const frequency = (["oneTime", "weekly", "monthly"] as BookingFrequency[]).find((f) => f === q.frequency);
  const duration = Number(q.duration);
  const days = [...new Set((q.days ?? "").split(",").filter((d) => /^[0-6]$/.test(d)).map(Number))];
  const start = q.start && parseISODate(q.start) ? q.start : null;
  const time = q.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(q.time) ? q.time : null;
  const { year, month, day } = getPlatformTodayParts(getPlatformNowMs());
  const todayISO = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const valid =
    frequency &&
    q.subject &&
    tutor.subjects.includes(q.subject) &&
    tutor.classDurations.includes(duration) &&
    start &&
    start >= todayISO &&
    time &&
    (frequency === "oneTime" || (days.length > 0 && days.length <= 7 && days.includes(dayOfWeekISO(start))));
  if (!valid) redirect(bookHref);

  const admin = getServiceRoleClient();
  const [{ data: person }, { data: studentProfile }] = await Promise.all([
    admin.from("profiles").select("full_name, email, phone").eq("id", profile.id).maybeSingle(),
    admin.from("student_profiles").select("phone").eq("id", profile.id).maybeSingle(),
  ]);
  const rawPhone = (person?.phone as string | null) || (studentProfile?.phone as string | null) || "";

  return (
    <ReviewBookingReal
      tutor={tutor}
      selection={{ subject: q.subject!, duration, frequency: frequency!, days: frequency === "oneTime" ? [] : days, startISO: start!, time: time! }}
      student={{
        fullName: (person?.full_name as string | null)?.trim() || profile.fullName,
        email: (person?.email as string | null) || profile.email,
        // The form shows the +234 prefix itself.
        phone: rawPhone.replace(/^\+?234\s*/, "").replace(/^0/, ""),
      }}
      testMode={!isPaystackConfigured()}
    />
  );
}
