"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  GraduationCap,
  Heart,
  Laptop2,
  MessageCircle,
  MessageSquare,
  MonitorPlay,
  NotebookPen,
  Plane,
  Repeat2,
  Star,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { TrustReliabilityList } from "@/components/shared/trust-reliability-list";
import { setTutorSaved } from "@/lib/actions/student-profile";
import { sessionPrice } from "@/lib/booking-slots";
import { formatNaira } from "@/lib/format";
import type { TutorDirectoryEntry, TutorPublicProfile } from "@/lib/tutor-directory-server";
import { cn } from "@/lib/utils";

import { PersonAvatar } from "./live-shared";
import { availabilityLabel, experienceLabel, monthYear, responseLabel, teachingLevels, to12h, tutorTitle, WEEKDAY_LONG } from "./tutor-ui";

const REVIEW_PREVIEW = 3;

const styleIcons: Record<string, typeof Target> = {
  "Problem Solving": Target,
  "Exam-focused": FileText,
  Practical: Laptop2,
  "Discussion-based": MessageSquare,
  Interactive: Repeat2,
  "One-on-one": Users,
  "Visual Learning": MonitorPlay,
  "Project-based": NotebookPen,
};

const styleDescriptions: Record<string, string> = {
  "Problem Solving": "Works through problems step by step so the method sticks, not just the answer.",
  "Exam-focused": "Practice and pacing built around WAEC, JAMB and IGCSE requirements.",
  Practical: "Hands-on examples and real-world context, not just theory.",
  "Discussion-based": "Encourages questions and discussion throughout every session.",
  Interactive: "Keeps sessions active and two-way rather than one-sided lectures.",
  "One-on-one": "Adapts pace and explanations to how each student learns best.",
  "Visual Learning": "Uses diagrams and visuals to make ideas easier to picture.",
  "Project-based": "Learning anchored in projects and applied practice, not just drills.",
};

const formatLabels: Record<string, string> = { Private: "Private lessons", Group: "Group classes" };

// Monday-first, as on the design.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function useSave(tutorId: string, initial: boolean, disabled = false) {
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  function toggle() {
    if (disabled) return;
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await setTutorSaved(tutorId, next);
      if (!result.ok) {
        setSaved(!next);
        toast.error(result.message ?? "Couldn't update your saved tutors.");
      }
    });
  }
  return { saved, pending, toggle };
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
  similarTutors = [],
  savedIds = [],
}: {
  tutor: TutorPublicProfile;
  initiallySaved: boolean;
  preview?: boolean;
  canMessage?: boolean;
  nowMs: number;
  similarTutors?: TutorDirectoryEntry[];
  savedIds?: string[];
}) {
  const { saved, pending, toggle } = useSave(t.id, initiallySaved, preview);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const firstName = t.name.split(" ")[0];
  const bookHref = `/student-dashboard/tutors/${t.id}/book`;
  const bookable = !preview && Boolean(t.pricePerHour) && !t.onVacation;
  const messageHref = (draft?: string) => `/student-dashboard/messages?tutor=${t.id}${draft ? `&draft=${encodeURIComponent(draft)}` : ""}`;
  const avail = availabilityLabel(t, nowMs);
  const levels = teachingLevels(t);
  const topRated = t.rating !== null && t.rating >= 4.8 && t.reviewCount >= 10;
  const reviews = showAllReviews ? t.reviews : t.reviews.slice(0, REVIEW_PREVIEW);
  const helpWith = [...t.teachingFormats.map((f) => formatLabels[f] ?? f), ...t.sessionTypes];

  return (
    <div>
      {preview ? (
        <div className="flex items-start gap-2 rounded-2xl bg-indigo-50 p-4 text-sm text-ensena-ink">
          <Eye className="mt-0.5 size-4 shrink-0 text-indigo-500" />
          This is exactly what students see on your profile. Buttons are switched off in preview.
        </div>
      ) : (
        <Link href="/student-dashboard/find-a-tutor" className="flex w-fit items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
          <ChevronLeft className="size-4" /> Back to teachers
        </Link>
      )}

      {t.onVacation && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Plane className="mt-0.5 size-4 shrink-0" />
          {firstName} is taking a break and isn&apos;t accepting new bookings right now.
        </div>
      )}

      {/* Hero + trust corner */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6 rounded-2xl border border-ensena-border bg-ensena-surface p-6 sm:flex-row">
          <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-ensena-primary/5 sm:w-64">
            <PersonAvatar name={t.name} image={t.image} className={cn("absolute inset-0 size-full rounded-none", !t.image && "text-6xl")} />
            {t.online && <span className="absolute bottom-2 right-2 size-4 rounded-full border-2 border-white bg-ensena-success" />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{t.name}</h1>
                  <BadgeCheck className="size-5 text-ensena-primary" aria-label="Verified tutor" />
                  {t.founding && <FoundingBadge kind="Tutor" compact />}
                </div>
                <p className="text-ensena-muted">{tutorTitle(t)}</p>
              </div>
              <button
                type="button"
                aria-pressed={saved}
                disabled={pending || preview}
                onClick={toggle}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-ensena-border px-3 py-1.5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                {saved && <Heart className="size-3.5 fill-ensena-primary text-ensena-primary" />}
                {saved ? "Saved" : "Save"}
              </button>
            </div>

            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-ensena-ink">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {t.rating !== null ? (
                <>
                  <span className="font-medium">{t.rating}</span>
                  <span className="text-ensena-muted">
                    ({t.reviewCount} {t.reviewCount === 1 ? "review" : "reviews"})
                  </span>
                </>
              ) : (
                <span className="text-ensena-muted">New tutor · no reviews yet</span>
              )}
              {topRated && (
                <>
                  <span className="text-ensena-border">·</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Top Rated</span>
                </>
              )}
              <span className="text-ensena-border">·</span>
              <span className={cn("flex items-center gap-1", avail.today ? "text-ensena-success" : "text-ensena-muted")}>
                <span className={cn("size-1.5 rounded-full", avail.today ? "bg-ensena-success" : "bg-ensena-muted")} /> {avail.label}
              </span>
            </p>

            <p className="mt-3 whitespace-pre-line text-sm text-ensena-muted">{t.headline || t.bio}</p>

            {t.pricePerHour && (
              <p className="mt-4 text-xl font-semibold text-ensena-ink">
                From {formatNaira(sessionPrice(t.pricePerHour, 30))} <span className="text-sm font-normal text-ensena-muted">/ 30 min</span>
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2.5">
              {!preview && !bookable ? (
                <p className="rounded-2xl border border-ensena-border bg-ensena-bg-soft p-4 text-sm font-medium text-ensena-muted">
                  {t.onVacation ? `${firstName} is not currently available for new bookings.` : `${firstName} hasn't set a price yet, so they can't be booked online.`}
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <Button
                      disabled={preview}
                      nativeButton={false}
                      render={<Link href={preview ? "#" : bookHref} />}
                      className="h-11 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
                    >
                      Book Instantly
                    </Button>
                    <Button
                      variant="outline"
                      disabled={preview || !canMessage}
                      nativeButton={false}
                      render={<Link href={preview ? "#" : messageHref(`Hi ${firstName}, I'd like to book a 25-minute Discovery Session to see if we're a good fit. When are you free?`)} />}
                      className="h-11 flex-1 rounded-full border-ensena-border text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
                    >
                      Discovery Session
                    </Button>
                  </div>
                  <Link
                    href={preview || !canMessage ? "#" : messageHref(`Hi ${firstName}, before I book, could you confirm you can help me with my lessons? Here's what I need: `)}
                    aria-disabled={preview || !canMessage}
                    className={cn("flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft", (preview || !canMessage) && "pointer-events-none opacity-50")}
                  >
                    Send a pre-approval request
                  </Link>
                </>
              )}
              <Link
                href={preview || !canMessage ? "#" : messageHref()}
                aria-disabled={preview || !canMessage}
                className={cn("flex items-center justify-center gap-1.5 text-xs font-medium text-ensena-muted hover:text-ensena-ink", (preview || !canMessage) && "pointer-events-none")}
              >
                <MessageCircle className="size-3.5" /> Or message {firstName} directly
              </Link>
              {!preview && !canMessage && <p className="text-center text-xs text-ensena-muted">{firstName} takes messages from their students. Book a lesson to get in touch.</p>}
            </div>
          </div>
        </div>

        {/* Trust / performance corner card */}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Performance</p>
          <dl className="mt-2 flex flex-col gap-1.5 text-xs">
            {[
              ["Students taught", String(t.studentsTaught)],
              ["Lessons taught", t.completedLessons > 0 ? `${t.completedLessons}+` : "0"],
              ["Repeat students", t.repeatStudentsPct === null ? "—" : `${t.repeatStudentsPct}%`],
              ["Cancellation rate", t.cancellationRatePct === null ? "—" : `${t.cancellationRatePct}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-ensena-muted">{label}</dt>
                <dd className="font-semibold text-ensena-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 border-t border-ensena-border pt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">On Ensena</p>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-ensena-muted">Joined Ensena</span>
            <span className="font-semibold text-ensena-ink">{monthYear(t.memberSince)}</span>
          </div>

          <p className="mt-3 border-t border-ensena-border pt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Trust &amp; reliability</p>
          <TrustReliabilityList trust={t.trust} className="mt-1.5 text-xs" />
          {t.founding && <FoundingBadge kind="Tutor" showExplanation className="mt-3 border-t border-ensena-border pt-3" />}
        </div>
      </div>

      {/* About + Subjects */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">About {firstName}</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-ensena-muted">{t.bio ? `Hi, I'm ${firstName}. ${t.bio}` : `${firstName} hasn't written an introduction yet.`}</p>
          <ul className="mt-3 grid grid-cols-1 gap-2.5 text-sm text-ensena-ink sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <Calendar className="size-3.5 shrink-0 text-ensena-primary" /> {experienceLabel(t.yearsExperience)}
            </li>
            <li className="flex items-center gap-2">
              <Users className="size-3.5 shrink-0 text-ensena-primary" /> {t.completedLessons}+ lessons taught
            </li>
            <li className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-ensena-primary" /> Expert in {levels.join(", ") || "all levels"}
            </li>
            <li className="flex items-start gap-2">
              <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-ensena-primary" /> {responseLabel(t.responseTime)}
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Subjects &amp; Exam Expertise</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...t.subjects, ...t.exams].map((tag) => (
              <span key={tag} className="rounded-full bg-ensena-primary/10 px-3 py-1.5 text-sm font-medium text-ensena-primary">
                {tag}
              </span>
            ))}
          </div>
          {levels.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-ensena-border pt-4">
              {levels.map((lvl) => (
                <span key={lvl} className="flex items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-3 py-1.5 text-xs font-medium text-ensena-ink">
                  <GraduationCap className="size-3.5 text-ensena-primary" /> {lvl}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* What I can help with */}
      {helpWith.length > 0 && (
        <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-6">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">What I can help with</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {helpWith.map((label) => (
              <span key={label} className="rounded-full bg-ensena-primary/10 px-3 py-1.5 text-sm font-medium text-ensena-primary">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Teaching style & approach + Reviews */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Teaching style &amp; approach</h2>
          {t.teachingStyles.length === 0 ? (
            <p className="mt-3 text-sm text-ensena-muted">{firstName} hasn&apos;t described their teaching style yet. Book a Discovery Session to see how they teach.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {t.teachingStyles.map((style) => {
                const Icon = styleIcons[style] ?? Target;
                return (
                  <div key={style} className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-primary">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ensena-ink">{style}</p>
                      {styleDescriptions[style] && <p className="mt-0.5 text-xs text-ensena-muted">{styleDescriptions[style]}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div id="reviews" className="scroll-mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Reviews</h2>
            {t.reviews.length > REVIEW_PREVIEW && (
              <button type="button" onClick={() => setShowAllReviews((v) => !v)} className="text-sm font-semibold text-ensena-primary hover:underline">
                {showAllReviews ? "Show fewer" : "View all reviews"}
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <p className="font-heading text-3xl font-semibold text-ensena-ink">{t.rating ?? "—"}</p>
            <div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={cn("size-3", i < Math.round(t.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-ensena-border")} />
                ))}
              </div>
              <p className="text-xs text-ensena-muted">
                Based on {t.reviewCount} {t.reviewCount === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = t.ratingBreakdown[star];
              const pct = t.reviewCount > 0 ? (count / t.reviewCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-ensena-muted">
                  <span className="w-8 shrink-0">{star} ★</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ensena-border">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 shrink-0 text-right">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-ensena-border pt-4">
            {reviews.length === 0 ? (
              <p className="text-xs text-ensena-muted">No reviews yet. Be one of the first students to learn with {firstName}.</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ensena-ink">{review.reviewerName}</p>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: review.rating }, (_, j) => (
                        <Star key={j} className="size-3 fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                  </div>
                  {review.comment && <p className="mt-1 text-xs text-ensena-muted">{review.comment}</p>}
                  {review.tutorReply && <p className="mt-1.5 rounded-lg bg-ensena-bg-soft p-2 text-[11px] text-ensena-muted">Reply from {firstName}: {review.tutorReply}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Availability */}
      <section className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-6">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">{firstName}&apos;s availability</h2>
        <ul className="mt-3 divide-y divide-ensena-border overflow-hidden rounded-xl border border-ensena-border">
          {DAY_ORDER.map((dow) => {
            const ranges = t.onVacation ? [] : t.weekly.filter((r) => r.dayOfWeek === dow);
            return (
              <li key={dow} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-ensena-ink">{WEEKDAY_LONG[dow]}</span>
                <span className={ranges.length ? "text-ensena-ink" : "text-ensena-muted"}>{ranges.length ? ranges.map((r) => `${to12h(r.start)} – ${to12h(r.end)}`).join(", ") : "Unavailable"}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-ensena-muted">Times shown in WAT (GMT+1). Exact session times are chosen at booking.</p>
      </section>

      {/* Group classes + booking CTA */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Group classes by {firstName}</h2>
            {t.groupClasses.length > 0 && (
              <Link href="/student-dashboard/group-classes" className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                View all classes <ChevronRight className="size-3.5" />
              </Link>
            )}
          </div>
          {t.groupClasses.length === 0 ? (
            <p className="mt-3 text-sm text-ensena-muted">{firstName} doesn&apos;t currently run any group classes.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {t.groupClasses.map((c) => (
                <Link key={c.id} href={`/student-dashboard/group-classes?q=${encodeURIComponent(c.title)}`} className="rounded-2xl border border-ensena-border p-4 transition-shadow hover:shadow-md">
                  <p className="text-sm font-semibold text-ensena-ink">{c.title}</p>
                  <p className="mt-1 text-xs text-ensena-muted">{[c.level, c.subject].filter(Boolean).join(" · ")}</p>
                  {c.startDate && <p className="mt-0.5 text-xs text-ensena-muted">Starts {new Date(`${c.startDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ensena-ink">{c.price ? formatNaira(c.price) : "—"}</span>
                    <span className="text-ensena-muted">
                      {c.seatsFilled} / {c.seatsTotal} seats
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col justify-center rounded-2xl bg-ensena-primary/5 p-5">
          <p className="text-sm font-semibold text-ensena-ink">Ready to start learning?</p>
          <p className="mt-1 text-xs text-ensena-muted">Book a session or meet {firstName} in a discovery session to see if they&apos;re the right fit for you.</p>
          <Button
            disabled={!bookable}
            nativeButton={false}
            render={<Link href={bookable ? bookHref : "#"} />}
            className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
          >
            Book a session now
          </Button>
        </div>
      </div>

      {!preview && similarTutors.length > 0 && <SimilarTutors tutors={similarTutors} savedIds={savedIds} />}
    </div>
  );
}

function SimilarTutors({ tutors, savedIds }: { tutors: TutorDirectoryEntry[]; savedIds: string[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-heading text-xl font-semibold text-ensena-ink lg:text-3xl">Similar Tutors You Might Like</h2>
        <Link href="/student-dashboard/find-a-tutor" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
          View all tutors <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="relative mt-5 lg:mt-8">
        <div ref={scroller} className="flex gap-3 overflow-x-auto pb-2 scrollbar-none lg:gap-6 [&::-webkit-scrollbar]:hidden">
          {tutors.map((t) => (
            <SimilarTutorCard key={t.id} tutor={t} initiallySaved={savedIds.includes(t.id)} />
          ))}
        </div>
        {tutors.length > 3 && (
          <>
            <button type="button" aria-label="Scroll left" onClick={() => scrollBy(-1)} className="absolute -left-4 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-ensena-border bg-ensena-surface text-ensena-ink shadow-md hover:scale-105 lg:flex">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" aria-label="Scroll right" onClick={() => scrollBy(1)} className="absolute -right-4 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-ensena-border bg-ensena-surface text-ensena-ink shadow-md hover:scale-105 lg:flex">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function SimilarTutorCard({ tutor: t, initiallySaved }: { tutor: TutorDirectoryEntry; initiallySaved: boolean }) {
  const { saved, pending, toggle } = useSave(t.id, initiallySaved);
  const href = `/student-dashboard/tutors/${t.id}`;
  return (
    <article className="flex w-[46vw] shrink-0 flex-col overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:w-56 lg:w-64">
      <div className="relative aspect-4/3 w-full bg-ensena-primary/5">
        <PersonAvatar name={t.name} image={t.image} className={cn("absolute inset-0 size-full rounded-none", !t.image && "text-4xl")} />
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved tutors" : "Save tutor"}
          disabled={pending}
          onClick={toggle}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-ensena-ink shadow-sm hover:scale-110"
        >
          <Heart className={cn("size-4", saved && "fill-ensena-primary text-ensena-primary")} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 lg:p-5">
        <div className="flex items-center gap-1.5">
          <Link href={href} className="truncate font-heading text-sm font-semibold text-ensena-ink hover:underline">
            {t.name}
          </Link>
          <BadgeCheck className="size-3.5 shrink-0 text-ensena-primary" />
        </div>
        <p className="text-xs text-ensena-muted">{tutorTitle(t)}</p>
        <p className="flex items-center gap-1 text-xs text-ensena-ink">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          {t.rating !== null ? (
            <>
              <span className="font-medium">{t.rating}</span> <span className="text-ensena-muted">({t.reviewCount} reviews)</span>
            </>
          ) : (
            <span className="text-ensena-muted">New tutor</span>
          )}
        </p>
        <p className="mt-1 text-sm font-semibold text-ensena-ink">
          {t.pricePerHour ? `From ${formatNaira(t.pricePerHour)}` : "Price on request"} <span className="font-normal text-ensena-muted">/ hour</span>
        </p>
        <Button variant="outline" nativeButton={false} render={<Link href={href} />} className="mt-2 h-10 w-full rounded-full border-ensena-border text-sm font-medium">
          View Profile
        </Button>
      </div>
    </article>
  );
}
