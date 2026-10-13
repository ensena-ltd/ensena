"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useNowMs } from "@/hooks/use-now-ms";
import { getCounsellingTimeRange, initialCounsellingAppointments } from "@/lib/admin-counselling-data";
import { canEnterClassroom, getClassEntryState, STUDENT_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { counsellor } from "@/lib/counsellor-data";
import { formatNaira } from "@/lib/format";
import { groupClassListings } from "@/lib/group-classes-data";
import { tutorListings } from "@/lib/tutors";

// Counselling only earns a spot on the dashboard once the student has
// actually used it — no permanent "Speak to a Counsellor" tile taking up
// space for students who never booked. Visibility is based on real
// counselling records, not whether they merely visited the booking page.
export function CounsellingDashboardCard({ studentName }: { studentName: string }) {
  const nowMs = useNowMs();

  const records = initialCounsellingAppointments
    .filter((a) => a.student === studentName)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  // The soonest upcoming session, not the furthest-dated one — a student
  // can have more than one booked at once (e.g. today's session plus an
  // already-scheduled follow-up further out).
  const upcoming = [...records].filter((a) => a.status === "New Booking" || a.status === "Upcoming" || a.status === "In Progress").sort((a, b) => a.dateISO.localeCompare(b.dateISO))[0];
  const lastPast = records.find((a) => a.status === "Completed" || a.status === "Follow-up");

  const timeRange = upcoming ? getCounsellingTimeRange(upcoming) : null;
  const entryState = timeRange ? getClassEntryState({ ...timeRange, role: "student", nowMs }) : null;
  const startingSoon = entryState === "entry-available" && timeRange ? timeRange.startMs - nowMs <= 15 * 60_000 : false;
  const enterable = entryState ? canEnterClassroom(entryState) : false;
  const entryHint =
    entryState === "too-early" && timeRange
      ? entryOpensHint(timeRange.startMs - STUDENT_ENTRY_WINDOW_MS, nowMs, "Session")
      : entryState === "ended"
        ? "This session has ended"
        : undefined;

  if (!upcoming && !lastPast) return null;

  if (upcoming) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Counselling</h2>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Your next session</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-full"><Image src={counsellor.image} alt={counsellor.name} fill sizes="44px" className="object-cover" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ensena-ink">{counsellor.name}</p>
            <p className="truncate text-xs text-ensena-muted">Enseña {counsellor.role}</p>
          </div>
          {startingSoon ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
              <span className="size-1.5 rounded-full bg-rose-600 animate-pulse" /> Starting soon
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <span className="size-1.5 rounded-full bg-current" /> {upcoming.status === "In Progress" ? "In Progress" : "Confirmed"}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm font-semibold text-ensena-ink">{upcoming.dateLabel}</p>
        <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><Clock className="size-3.5" /> {upcoming.time} – {upcoming.endTime} · Video Call</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            disabled={!enterable}
            {...(enterable ? { nativeButton: false, render: <Link href={`/student-dashboard/classroom/counselling/${upcoming.id}`} /> } : {})}
            className="h-11 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
          >
            <Video className="size-4" /> Enter Session
          </Button>
        </div>
        {!enterable && entryHint && <p className="mt-2 text-xs font-medium text-ensena-primary">{entryHint}</p>}
        <Link href={`/student-dashboard/counselling/${upcoming.id}`} className="mt-2.5 inline-flex text-xs font-semibold text-ensena-primary hover:underline">
          View Counselling Details →
        </Link>
      </div>
    );
  }

  const recommendation = lastPast!.recommendation;
  const recommendedTutor = recommendation?.tutorSlug ? tutorListings.find((t) => t.slug === recommendation.tutorSlug) : undefined;
  const recommendedClass = recommendation?.groupClassSlug ? groupClassListings.find((c) => c.slug === recommendation.groupClassSlug) : undefined;

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Counselling</h2>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Session completed</p>
      <p className="text-sm font-medium text-ensena-ink">{counsellor.name} · {lastPast!.dateLabel}</p>

      {recommendation && (
        <div className="mt-3 rounded-xl bg-ensena-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">Benny&apos;s Recommendation</p>
          <p className="mt-1 text-sm text-ensena-ink">{recommendation.message}</p>

          {recommendedTutor && (
            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-white p-2.5">
              <div className="relative size-10 shrink-0 overflow-hidden rounded-full"><Image src={recommendedTutor.image} alt={recommendedTutor.name} fill sizes="40px" className="object-cover" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ensena-ink">{recommendedTutor.name}</p>
                <p className="truncate text-xs text-ensena-muted">{recommendedTutor.subject} · {formatNaira(recommendedTutor.price)}/hr</p>
              </div>
              <Button variant="outline" nativeButton={false} render={<Link href={`/find-teachers/${recommendedTutor.slug}`} />} className="h-8 shrink-0 rounded-full border-ensena-border px-3 text-xs font-semibold">View Tutor</Button>
            </div>
          )}

          {recommendedClass && (
            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-white p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ensena-ink">{recommendedClass.title}</p>
                <p className="truncate text-xs text-ensena-muted">{recommendedClass.levelBadge} · {formatNaira(recommendedClass.price)}/session</p>
              </div>
              <Button variant="outline" nativeButton={false} render={<Link href={`/group-classes/${recommendedClass.slug}`} />} className="h-8 shrink-0 rounded-full border-ensena-border px-3 text-xs font-semibold">View Class</Button>
            </div>
          )}

          {recommendation.type === "study-plan" && !recommendedTutor && !recommendedClass && lastPast!.actionPlan && (
            <p className="mt-2 text-xs font-medium text-ensena-primary">{lastPast!.actionPlan.tasks.filter((t) => t.status === "Done").length} of {lastPast!.actionPlan.tasks.length} tasks completed</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button nativeButton={false} render={<Link href="/student-dashboard/counselling" />} className="h-10 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
          View Counselling →
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/counsellor" />} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">
          Book Another Session
        </Button>
      </div>
    </div>
  );
}
