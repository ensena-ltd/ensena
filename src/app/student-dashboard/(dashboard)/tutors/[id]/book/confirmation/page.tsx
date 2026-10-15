import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BookingConfirmationReal } from "@/components/student-dashboard/live/booking-confirmation-real";
import { joinDays, timeRange } from "@/components/student-dashboard/live/tutor-ui";
import type { BookingFrequency } from "@/lib/booking-slots";
import { requestOrigin } from "@/lib/site-url-server";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadTutorProfile } from "@/lib/tutor-directory-server";

export const metadata: Metadata = {
  title: "Booking confirmed | Ensena Student Dashboard",
};

const UUID = /^[0-9a-f-]{36}$/i;
const lagos = (ms: number, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", ...opts }).format(ms);

// Shown after a booking is paid (test checkout, or the Paystack callback).
export default async function BookingConfirmationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ booking?: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) redirect("/student-dashboard/find-a-tutor");
  const profile = await requireRole("student");
  if (!profile) redirect("/sign-in");
  const { booking } = await searchParams;
  if (!booking || !UUID.test(booking)) redirect("/student-dashboard/lessons");

  const [tutor, { data }] = await Promise.all([
    loadTutorProfile(id),
    getServiceRoleClient()
      .from("private_lessons")
      .select("id, booking_reference, subject, scheduled_at, duration_minutes, frequency, price, payment_status, status")
      .eq("booking_group_id", booking)
      .eq("student_id", profile.id)
      .eq("tutor_id", id)
      .order("scheduled_at"),
  ]);
  if (!tutor) notFound();
  const lessons = (data ?? []) as { id: string; booking_reference: string; subject: string; scheduled_at: string; duration_minutes: number; frequency: string | null; price: number; payment_status: string; status: string }[];
  if (lessons.length === 0) redirect("/student-dashboard/lessons");
  // Not paid (yet) — My Classes shows it with a "Pay now" button.
  if (lessons.some((l) => l.payment_status !== "paid")) redirect(`/student-dashboard/lessons?view=${lessons[0].id}`);

  const first = lessons[0];
  const startMs = new Date(first.scheduled_at).getTime();
  // Lesson weekdays in Lagos time (UTC+1 all year).
  const weekdays = [...new Set(lessons.map((l) => new Date(new Date(l.scheduled_at).getTime() + 3_600_000).getUTCDay()))];
  const order = [1, 2, 3, 4, 5, 6, 0];
  weekdays.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const hhmm = lagos(startMs, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  return (
    <BookingConfirmationReal
      tutor={tutor}
      origin={await requestOrigin()}
      booking={{
        reference: first.booking_reference,
        subject: first.subject,
        durationMinutes: first.duration_minutes,
        frequency: ((first.frequency as BookingFrequency | null) ?? "oneTime"),
        daysLabel: joinDays(weekdays),
        timeLabel: timeRange(hhmm, first.duration_minutes),
        totalPaid: lessons.reduce((sum, l) => sum + Number(l.price), 0),
        lessons: lessons.map((l) => {
          const s = new Date(l.scheduled_at).getTime();
          return { id: l.id, startMs: s, endMs: s + l.duration_minutes * 60_000 };
        }),
      }}
    />
  );
}
