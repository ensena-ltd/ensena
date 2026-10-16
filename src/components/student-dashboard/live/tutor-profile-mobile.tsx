"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Eye, GraduationCap, Heart, MessageCircle, MessageSquare, Plane, Share2, Star, Target, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { TrustReliabilityList } from "@/components/shared/trust-reliability-list";
import { styleDescriptions, styleIcons, whatYoullLearn } from "@/app/find-teachers/[slug]/tutor-profile-client";
import { sessionPrice } from "@/lib/booking-slots";
import { formatNaira } from "@/lib/format";
import type { TutorPublicProfile } from "@/lib/tutor-directory-server";
import { cn } from "@/lib/utils";

import { PersonAvatar } from "./live-shared";
import { availabilityLabel, experienceLabel, monthYear, responseLabel, teachingLevels, to12h, tutorTitle, WEEKDAY_LONG } from "./tutor-ui";

const REVIEW_PREVIEW = 3;
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const formatLabels: Record<string, string> = { Private: "Private lessons", Group: "Group classes" };

// Mobile-only tutor profile (below lg, where the bottom tab bar shows) —
// the single-scroll mobile design with a "Tutor profile" header and a
// sticky Book Instantly bar. Desktop keeps TutorProfileReal's own grid.
// Same live data and the same actions as desktop (save, book, discovery
// request, pre-approval request, message).
export function TutorProfileMobile({
  tutor: t,
  preview,
  canMessage,
  nowMs,
  saved,
  savePending,
  onToggleSave,
  similarTutors,
}: {
  tutor: TutorPublicProfile;
  preview: boolean;
  canMessage: boolean;
  nowMs: number;
  saved: boolean;
  savePending: boolean;
  onToggleSave: () => void;
  similarTutors: ReactNode;
}) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const firstName = t.name.split(" ")[0];
  const bookHref = `/student-dashboard/tutors/${t.id}/book`;
  const bookable = !preview && Boolean(t.pricePerHour) && !t.onVacation;
  const messagingOff = preview || !canMessage;
  const messageHref = (draft?: string) => `/student-dashboard/messages?tutor=${t.id}${draft ? `&draft=${encodeURIComponent(draft)}` : ""}`;
  const avail = availabilityLabel(t, nowMs);
  const levels = teachingLevels(t);
  const topRated = t.rating !== null && t.rating >= 4.8 && t.reviewCount >= 10;
  const reviews = showAllReviews ? t.reviews : t.reviews.slice(0, REVIEW_PREVIEW);
  const helpWith = [...t.teachingFormats.map((f) => formatLabels[f] ?? f), ...t.sessionTypes];
  const halfHourPrice = t.pricePerHour ? sessionPrice(t.pricePerHour, 30) : null;
  const learnItems = whatYoullLearn(t.subjects[0] ?? "");

  async function share() {
    const url = window.location.href;
    const title = `${t.name} on Ensena`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${t.name}, ${tutorTitle(t)} on Ensena`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied.");
    } catch (err) {
      // The share sheet being dismissed isn't an error worth reporting.
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Couldn't share this profile.");
    }
  }

  return (
    <div className={cn("lg:hidden", bookable && "pb-20")}>
      <header
        className={cn(
          "flex h-16 items-center justify-between border-b border-ensena-border bg-ensena-surface px-2",
          // Full-bleed and pinned just under the dashboard's mobile top bar.
          !preview && "sticky top-[61px] z-30 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6"
        )}
      >
        {preview ? (
          <span className="size-11" />
        ) : (
          <Link href="/student-dashboard/find-a-tutor" aria-label="Back to tutors" className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft">
            <ChevronLeft className="size-6" />
          </Link>
        )}
        <h1 className="font-heading text-base font-semibold text-ensena-ink">Tutor profile</h1>
        <div className="flex items-center">
          <button type="button" aria-label="Share tutor profile" onClick={() => void share()} className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft">
            <Share2 className="size-4.5" />
          </button>
          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save tutor"}
            disabled={savePending || preview}
            onClick={onToggleSave}
            className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <Heart className={cn("size-5", saved && "fill-ensena-primary text-ensena-primary")} />
          </button>
        </div>
      </header>

      <div className="pt-4">
        {preview && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl bg-indigo-50 p-4 text-sm text-ensena-ink">
            <Eye className="mt-0.5 size-4 shrink-0 text-indigo-500" />
            This is exactly what students see on your profile. Buttons are switched off in preview.
          </div>
        )}
        {t.onVacation && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Plane className="mt-0.5 size-4 shrink-0" />
            {firstName} is taking a break and isn&apos;t accepting new bookings right now.
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="relative size-20 shrink-0">
            <PersonAvatar name={t.name} image={t.image} className="size-20 rounded-2xl text-2xl" />
            {t.online && <span className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-white bg-ensena-success" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="truncate font-heading text-xl font-bold text-ensena-ink">{t.name}</h2>
              <BadgeCheck className="size-5 shrink-0 text-ensena-primary" aria-label="Verified tutor" />
              {t.founding && <FoundingBadge kind="Tutor" compact />}
            </div>
            <p className="truncate text-sm text-ensena-muted">{tutorTitle(t)}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ensena-ink">
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
              {t.rating !== null ? (
                <>
                  <span className="font-medium">{t.rating}</span>
                  <span className="text-ensena-muted">({t.reviewCount})</span>
                </>
              ) : (
                <span className="text-ensena-muted">New tutor</span>
              )}
              {topRated && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Top Rated</span>}
            </p>
          </div>
        </div>

        {avail.today && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-ensena-success">
            <span className="size-1.5 rounded-full bg-ensena-success" /> Available today
          </p>
        )}

        {halfHourPrice !== null && (
          <p className="mt-3 text-xl font-semibold text-ensena-ink">
            From {formatNaira(halfHourPrice)} <span className="text-sm font-normal text-ensena-muted">/ 30 min</span>
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2.5">
          {!preview && !bookable ? (
            <p className="rounded-2xl border border-ensena-border bg-ensena-bg-soft p-4 text-sm font-medium text-ensena-muted">
              {t.onVacation ? `${firstName} is not currently available for new bookings.` : `${firstName} hasn't set a price yet, so they can't be booked online.`}
            </p>
          ) : (
            <>
              <Button disabled={preview} nativeButton={false} render={<Link href={preview ? "#" : bookHref} />} className="h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
                Book Instantly
              </Button>
              <Button
                variant="outline"
                disabled={messagingOff}
                nativeButton={false}
                render={<Link href={messagingOff ? "#" : messageHref(`Hi ${firstName}, I'd like to book a 25-minute Discovery Session to see if we're a good fit. When are you free?`)} />}
                className="h-12 w-full rounded-full border-ensena-border text-sm font-semibold text-ensena-ink"
              >
                Discovery Session
              </Button>
              <Link
                href={messagingOff ? "#" : messageHref(`Hi ${firstName}, before I book, could you confirm you can help me with my lessons? Here's what I need: `)}
                aria-disabled={messagingOff}
                className={cn("flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-ensena-border text-sm font-medium text-ensena-ink", messagingOff && "pointer-events-none opacity-50")}
              >
                Send a pre-approval request
              </Link>
            </>
          )}
          <Link
            href={messagingOff ? "#" : messageHref()}
            aria-disabled={messagingOff}
            className={cn("flex items-center justify-center gap-1.5 text-xs font-medium text-ensena-muted", messagingOff && "pointer-events-none")}
          >
            <MessageCircle className="size-3.5" /> Or message {firstName} directly
          </Link>
          {!preview && !canMessage && <p className="text-center text-xs text-ensena-muted">{firstName} takes messages from their students. Book a lesson to get in touch.</p>}
        </div>

        {/* Performance / trust */}
        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Performance</p>
          <dl className="mt-2 flex flex-col gap-1.5 text-sm">
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
          <div className="mt-1.5 flex items-center justify-between text-sm">
            <span className="text-ensena-muted">Joined Ensena</span>
            <span className="font-semibold text-ensena-ink">{monthYear(t.memberSince)}</span>
          </div>
          <p className="mt-3 border-t border-ensena-border pt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Trust &amp; reliability</p>
          <TrustReliabilityList trust={t.trust} className="mt-1.5 text-sm" />
          {t.founding && <FoundingBadge kind="Tutor" showExplanation className="mt-3 border-t border-ensena-border pt-3" />}
        </div>

        {/* About */}
        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">About {firstName}</h2>
          <p className={cn("mt-2 whitespace-pre-line text-sm text-ensena-muted", !bioExpanded && "line-clamp-3")}>{t.bio || `${firstName} hasn't written an introduction yet.`}</p>
          {t.bio && t.bio.length > 140 && (
            <button type="button" onClick={() => setBioExpanded((v) => !v)} className="mt-1 flex items-center gap-1 text-sm font-semibold text-ensena-primary">
              {bioExpanded ? "Show less" : "Read more"}
              <ChevronRight className={cn("size-3.5 transition-transform", bioExpanded ? "-rotate-90" : "rotate-90")} />
            </button>
          )}
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ensena-ink">
            <li className="flex items-center gap-2">
              <Calendar className="size-3.5 shrink-0 text-ensena-primary" /> {experienceLabel(t.yearsExperience)}
            </li>
            <li className="flex items-center gap-2">
              <Users className="size-3.5 shrink-0 text-ensena-primary" /> {t.completedLessons}+ lessons taught
            </li>
            <li className="flex items-center gap-2">
              <BadgeCheck className="size-3.5 shrink-0 text-ensena-primary" /> Expert in {levels.join(", ") || "all levels"}
            </li>
            <li className="flex items-center gap-2">
              <MessageSquare className="size-3.5 shrink-0 text-ensena-primary" /> {responseLabel(t.responseTime)}
            </li>
          </ul>
        </div>

        {/* Subjects & Exam Expertise */}
        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Subjects &amp; Exam Expertise</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from(new Set([...t.subjects, ...t.exams])).map((tag) => (
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

        {/* What I can help with */}
        {helpWith.length > 0 && (
          <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
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

        {/* Teaching style & approach */}
        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Teaching style &amp; approach</h2>
          {t.teachingStyles.length === 0 ? (
            <p className="mt-3 text-sm text-ensena-muted">{firstName} hasn&apos;t described their teaching style yet. Book a Discovery Session to see how they teach.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-4">
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

        {/* Reviews */}
        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
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

        {/* Availability */}
        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">{firstName}&apos;s availability</h2>
          <ul className="mt-3 divide-y divide-ensena-border overflow-hidden rounded-xl border border-ensena-border">
            {DAY_ORDER.map((dow) => {
              const ranges = t.onVacation ? [] : t.weekly.filter((r) => r.dayOfWeek === dow);
              return (
                <li key={dow} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="font-medium text-ensena-ink">{WEEKDAY_LONG[dow]}</span>
                  <span className={cn("text-right", ranges.length ? "text-ensena-ink" : "text-ensena-muted")}>
                    {ranges.length ? ranges.map((r) => `${to12h(r.start)} – ${to12h(r.end)}`).join(", ") : "Unavailable"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-ensena-muted">Times shown in WAT (GMT+1). Exact session times are chosen at booking.</p>
        </div>

        {/* Group classes */}
        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Group classes by {firstName}</h2>
            {t.groupClasses.length > 0 && (
              <Link href="/student-dashboard/group-classes" className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                View all
              </Link>
            )}
          </div>
          {t.groupClasses.length === 0 ? (
            <p className="mt-3 text-sm text-ensena-muted">{firstName} doesn&apos;t currently run any group classes.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {t.groupClasses.map((c) => (
                <Link key={c.id} href={`/student-dashboard/group-classes?q=${encodeURIComponent(c.title)}`} className="flex items-center gap-3 rounded-xl border border-ensena-border p-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                    <Users className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ensena-ink">{c.title}</p>
                    <p className="flex items-center gap-1 text-xs text-ensena-muted">
                      <Calendar className="size-3" />
                      {[c.level, c.subject].filter(Boolean).join(" · ")}
                      {c.startDate ? ` · Starts ${new Date(`${c.startDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-ensena-ink">{c.price ? `${formatNaira(c.price)} / session` : "—"}</span>
                      <span className="text-ensena-muted">
                        {c.seatsFilled} / {c.seatsTotal} seats
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Ready to start learning */}
        <div className="mt-4 rounded-2xl bg-ensena-primary/5 p-4">
          <p className="text-sm font-semibold text-ensena-ink">Ready to start learning?</p>
          <p className="mt-1 text-xs text-ensena-muted">{`Book a session or discover ${firstName} in a discovery session to see if they're the right fit for you.`}</p>
          <Button disabled={!bookable} nativeButton={false} render={<Link href={bookable ? bookHref : "#"} />} className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
            Book a session now
          </Button>
        </div>

        {/* What students can learn */}
        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">What students can learn</h2>
          <div className="mt-3 flex flex-col gap-2">
            {learnItems.map((item) => (
              <div key={item} className="flex items-center gap-2.5 rounded-xl border border-ensena-border p-3 text-sm text-ensena-ink">
                <CheckCircle2 className="size-4 shrink-0 text-ensena-success" /> {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {similarTutors}

      {/* Sticky Book Instantly bar — sits just above the dashboard's bottom tab bar. */}
      {bookable && halfHourPrice !== null && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 border-t border-ensena-border bg-ensena-surface/95 px-4 py-3 backdrop-blur-md">
          <p className="text-sm font-semibold text-ensena-ink">
            From {formatNaira(halfHourPrice)} <span className="block text-xs font-normal text-ensena-muted">/ 30 min</span>
          </p>
          <Button nativeButton={false} render={<Link href={bookHref} />} className="h-12 shrink-0 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white">
            Book Instantly →
          </Button>
        </div>
      )}
    </div>
  );
}
