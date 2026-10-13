"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarDays, Clock, Eye, GraduationCap, Heart, Languages, MapPin, MessageSquare, Plane, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setTutorSaved } from "@/lib/actions/student-profile";
import { DAY_NAMES } from "@/lib/booking-slots";
import { formatNaira } from "@/lib/format";
import type { TutorPublicProfile } from "@/lib/tutor-directory-server";
import { cn } from "@/lib/utils";

import { PersonAvatar } from "./live-shared";

const to12h = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

function lastActiveLabel(iso: string, nowMs: number): string {
  const minutes = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60_000));
  if (minutes < 10) return "Active now";
  if (minutes < 60) return `Active ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Active ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `Active ${days} ${days === 1 ? "day" : "days"} ago` : "Active over a month ago";
}

// `preview`: the tutor looking at their own profile from the Tutor
// Dashboard — same page students see, with every action switched off.
// `canMessage`: false when the tutor only takes messages from their own
// students and this student hasn't booked with them yet.
export function TutorProfileReal({
  tutor: t,
  initiallySaved,
  preview = false,
  canMessage = true,
  nowMs,
}: {
  tutor: TutorPublicProfile;
  initiallySaved: boolean;
  preview?: boolean;
  canMessage?: boolean;
  nowMs: number;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();
  const [showAllReviews, setShowAllReviews] = useState(false);

  function toggleSaved() {
    if (preview) return;
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await setTutorSaved(t.id, next);
      if (!result.ok) {
        setSaved(!next);
        toast.error(result.message ?? "Couldn't update your saved tutors.");
      }
    });
  }

  const byDay = DAY_NAMES.map((name, dow) => ({ name, ranges: t.weekly.filter((r) => r.dayOfWeek === dow) })).filter((d) => d.ranges.length > 0);
  const reviews = showAllReviews ? t.reviews : t.reviews.slice(0, 4);
  const bookHref = `/student-dashboard/tutors/${t.id}/book`;

  return (
    <div>
      {preview ? (
        <div className="flex items-start gap-2 rounded-2xl bg-indigo-50 p-4 text-sm text-ensena-ink">
          <Eye className="mt-0.5 size-4 shrink-0 text-indigo-500" />
          This is exactly what students see on your profile. Buttons are switched off in preview.
        </div>
      ) : (
        <Link href="/student-dashboard/find-a-tutor" className="inline-flex items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
          <ArrowLeft className="size-4" /> All tutors
        </Link>
      )}

      {t.onVacation && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Plane className="mt-0.5 size-4 shrink-0" />
          {t.name.split(" ")[0]} is taking a break and isn&apos;t accepting new bookings right now.
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
            <div className="flex flex-wrap items-start gap-4">
              <PersonAvatar name={t.name} image={t.image} className="size-20 text-2xl" />
              <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-1.5 font-heading text-2xl font-semibold text-ensena-ink">
                  {t.name} <BadgeCheck className="size-5 text-ensena-primary" aria-label="Verified tutor" />
                </h1>
                {t.headline && <p className="mt-0.5 text-sm text-ensena-muted">{t.headline}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ensena-muted">
                  <span className="flex items-center gap-1 text-ensena-ink">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    {t.rating !== null ? `${t.rating} · ${t.reviewCount} ${t.reviewCount === 1 ? "review" : "reviews"}` : "New tutor"}
                  </span>
                  {t.country && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-4" /> {t.country}
                    </span>
                  )}
                  {t.yearsExperience && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-4" /> {t.yearsExperience} teaching
                    </span>
                  )}
                  {t.completedLessons > 0 && <span>{t.completedLessons} lessons on Ensena</span>}
                  {t.lastActiveAt && (
                    <span className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-ensena-success" /> {lastActiveLabel(t.lastActiveAt, nowMs)}
                    </span>
                  )}
                </div>
              </div>
              <button type="button" aria-pressed={saved} disabled={pending || preview} onClick={toggleSaved} className="flex items-center gap-1.5 rounded-full border border-ensena-border px-3.5 py-2 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                <Heart className={cn("size-4", saved ? "fill-rose-500 text-rose-500" : "text-ensena-muted")} /> {saved ? "Saved" : "Save"}
              </button>
            </div>
            {t.bio && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ensena-ink">{t.bio}</p>}
          </section>

          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">What {t.name.split(" ")[0]} teaches</h2>
            <div className="mt-3 flex flex-col gap-4">
              {t.levelExpertise.map((e) => (
                <div key={e.level}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">{e.level}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {e.items.map((s) => (
                      <span key={s} className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">
                        {s}
                      </span>
                    ))}
                    {e.exams.map((x) => (
                      <span key={x} className="rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">
                        {x}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {(t.qualification || t.institution) && (
                <p className="flex items-start gap-2 text-ensena-ink">
                  <GraduationCap className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
                  {[t.qualification, t.fieldOfStudy, t.institution].filter(Boolean).join(" · ")}
                </p>
              )}
              {t.languages.length > 0 && (
                <p className="flex items-start gap-2 text-ensena-ink">
                  <Languages className="mt-0.5 size-4 shrink-0 text-ensena-muted" /> Speaks {t.languages.join(", ")}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Reviews</h2>
            {t.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-ensena-muted">No reviews yet. Be one of the first students to learn with {t.name.split(" ")[0]}.</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
                {reviews.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ensena-ink">{r.reviewerName}</p>
                      <p className="text-xs text-ensena-muted">{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="mt-0.5 flex">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={cn("size-3.5", i < r.rating ? "fill-amber-400 text-amber-400" : "text-ensena-border")} />
                      ))}
                    </div>
                    {r.comment && <p className="mt-1.5 text-sm text-ensena-ink">{r.comment}</p>}
                    {r.tutorReply && <p className="mt-2 rounded-lg bg-ensena-bg-soft p-2.5 text-xs text-ensena-muted">Reply from {t.name.split(" ")[0]}: {r.tutorReply}</p>}
                  </li>
                ))}
              </ul>
            )}
            {t.reviews.length > 4 && (
              <button type="button" onClick={() => setShowAllReviews((v) => !v)} className="mt-2 text-sm font-semibold text-ensena-primary hover:underline">
                {showAllReviews ? "Show fewer" : `Show all ${t.reviews.length} reviews`}
              </button>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:sticky lg:top-6">
            <p className="font-heading text-2xl font-semibold text-ensena-ink">{t.pricePerHour ? formatNaira(t.pricePerHour) : "—"}</p>
            <p className="text-xs text-ensena-muted">per hour · 1-on-1 · {t.teachingModes.join(", ") || "Online"}</p>
            {!t.pricePerHour ? (
              <p className="mt-4 rounded-xl bg-ensena-bg-soft p-3 text-xs text-ensena-muted">This tutor hasn&apos;t set a price yet, so they can&apos;t be booked online.</p>
            ) : t.onVacation ? (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Bookings are paused while {t.name.split(" ")[0]} is away.</p>
            ) : preview ? (
              <Button disabled className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white disabled:opacity-80">
                Book a lesson
              </Button>
            ) : (
              <Button nativeButton={false} render={<Link href={bookHref} />} className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
                Book a lesson
              </Button>
            )}
            {preview || !canMessage ? (
              <Button variant="outline" disabled className="mt-2 h-10 w-full rounded-full border-ensena-border text-sm font-medium">
                <MessageSquare className="size-4" /> Message {t.name.split(" ")[0]}
              </Button>
            ) : (
              <Button variant="outline" nativeButton={false} render={<Link href={`/student-dashboard/messages?tutor=${t.id}`} />} className="mt-2 h-10 w-full rounded-full border-ensena-border text-sm font-medium">
                <MessageSquare className="size-4" /> Message {t.name.split(" ")[0]}
              </Button>
            )}
            {!preview && !canMessage && <p className="mt-1.5 text-center text-xs text-ensena-muted">{t.name.split(" ")[0]} takes messages from their students — book a lesson to get in touch.</p>}
            <p className="mt-2 text-center text-xs text-ensena-muted">Lessons: {t.classDurations.map((d) => `${d} min`).join(" · ")}</p>
            {t.cancellationPolicy && <p className="mt-1 text-center text-xs text-ensena-muted">{t.cancellationPolicy} cancellation policy</p>}
          </section>

          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
              <CalendarDays className="size-4 text-ensena-primary" /> Weekly availability
            </h2>
            {byDay.length === 0 ? (
              <p className="mt-2 text-sm text-ensena-muted">No teaching hours set yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                {byDay.map((d) => (
                  <li key={d.name} className="flex justify-between gap-3">
                    <span className="text-ensena-muted">{d.name}</span>
                    <span className="text-right font-medium text-ensena-ink">{d.ranges.map((r) => `${to12h(r.start)} – ${to12h(r.end)}`).join(", ")}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-ensena-muted">Times are West Africa Time (Lagos).</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
