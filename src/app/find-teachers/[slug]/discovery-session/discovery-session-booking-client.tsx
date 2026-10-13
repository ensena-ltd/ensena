"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Lock,
  Paperclip,
  ShieldCheck,
  Star,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StartDateCalendar } from "@/components/find-teachers/start-date-calendar";
import { bookingBlockedMessage, studentBookingEligibilityByName, tutorBookingEligibilityByName } from "@/lib/account-permissions";
import { useTutorRating } from "@/hooks/use-reviews";
import { addDiscoverySession } from "@/lib/discovery-sessions-store";
import { hasCompletedFreeDiscovery, markFreeDiscoveryCompleted, subscribeDiscoveryCompleted } from "@/lib/discovery-sessions-data";
import { getLiveOfferById, respondToOffer } from "@/lib/messages-store";
import { formatOfferTime, getOfferById } from "@/lib/offers-data";
import { getAvailableSlots } from "@/lib/tutor-availability";
import { isTutorVerifiedByName } from "@/lib/tutor-verification-store";
import { getPendingAction, clearPendingAction } from "@/lib/pending-action-store";
import { requireAuthOrSaveDraft } from "@/lib/require-auth";
import type { TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

interface DiscoverySessionDraft {
  selectedDateISO: string;
  selectedTime: string;
  whatToLearn: string;
  academicLevel: string;
  goals: string;
  preferredLanguage: string;
}

// The discovery-sessions module's own established student identity — see
// the matching constant/comment in my-lessons-client.tsx. A newly-booked
// session must use this (not dashboardStudent.name) to actually show up in
// the student's own discovery-sessions list/upcoming-classes/my-lessons
// surfaces, which all filter on this same pre-existing, deliberately-kept
// name rather than dashboardStudent.
const DISCOVERY_STUDENT_NAME = "Sarah Johnson";
const DISCOVERY_STUDENT_IMAGE = "/teacher-4.jpg.png";

// hasCompletedFreeDiscovery() is a plain localStorage read that always
// returns false during SSR (no window there) — calling it directly in a
// render-time decision (as opposed to inside a click handler, which only
// ever runs client-side) would make this component's very first client
// render disagree with what the server sent whenever a student who already
// used their free session with this tutor loads the page again: a genuine
// hydration mismatch, not a cosmetic one, since it swaps the entire wizard
// for a completely different screen. useSyncExternalStore renders the
// server's "false" snapshot on the hydration-matching pass, then safely
// flips to the real value on a normal client-only re-render.
function useHasCompletedFreeDiscovery(tutorSlug: string): boolean {
  return useSyncExternalStore(
    subscribeDiscoveryCompleted,
    () => hasCompletedFreeDiscovery(tutorSlug),
    () => false
  );
}

// Combines the picked calendar day with the picked "4:00 PM"-style slot
// label into one real Date, so the classroom can enforce a genuine
// wall-clock 25-minute-maximum hard stop instead of "25 minutes after
// whoever happened to join first."
function combineDateAndTime(date: Date, timeLabel: string): Date {
  const match = timeLabel.match(/(\d+):(\d+)\s*(AM|PM)/i);
  const combined = new Date(date);
  if (!match) return combined;
  let hours = parseInt(match[1], 10) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;
  combined.setHours(hours, parseInt(match[2], 10), 0, 0);
  return combined;
}

// Every Discovery Session is a maximum of 25 minutes — a hard platform
// policy, not a per-tutor setting (see the comment on defaultTutorDiscoverySettings).
const DISCOVERY_CLASS_DURATION_MINS = 25;

const academicLevelOptions = ["Primary", "Secondary", "WAEC / NECO", "JAMB / UTME", "University", "Adult Learner"];

export function DiscoverySessionBookingClient({ tutor }: { tutor: TutorListing }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);
  const offerId = searchParams.get("offerId");
  // A live, runtime-created offer wins over the frozen seed array — see the
  // matching comment in tutor-booking-client.tsx.
  const offer = offerId ? (getLiveOfferById(offerId) ?? getOfferById(offerId)) : undefined;
  const isPreApprovedSlot = !!offer && offer.bookingKind === "discovery";
  const alreadyCompletedFreeDiscovery = useHasCompletedFreeDiscovery(tutor.slug);

  // Resuming after a require-auth.ts redirect to sign-in/sign-up — the
  // guest's answers were saved before they left. Read once via a lazy
  // initializer (not an effect) so the form mounts already-filled instead
  // of flashing empty then jumping to the resumed values.
  const resumeId = searchParams.get("resume");
  const [resumedDraft] = useState<DiscoverySessionDraft | null>(() => {
    if (!resumeId) return null;
    const draft = getPendingAction<DiscoverySessionDraft>(resumeId);
    return draft && draft.kind === "discovery-session" ? draft.data : null;
  });

  const [step, setStep] = useState(() => (resumedDraft ? 2 : isPreApprovedSlot ? 1 : 0));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    resumedDraft ? new Date(resumedDraft.selectedDateISO) : offer ? new Date(offer.date) : null
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(() =>
    resumedDraft ? resumedDraft.selectedTime : offer ? formatOfferTime(offer.time) : null
  );

  const [whatToLearn, setWhatToLearn] = useState(() => resumedDraft?.whatToLearn ?? "");
  const [academicLevel, setAcademicLevel] = useState(() => resumedDraft?.academicLevel ?? (tutor.levels[0] ?? academicLevelOptions[0]));
  const [goals, setGoals] = useState(() => resumedDraft?.goals ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState(() => resumedDraft?.preferredLanguage ?? tutor.nativeLanguage);
  const [fileName, setFileName] = useState<string | null>(null);

  // Draft only needs to be consumed once — clearing storage isn't state, so
  // this doesn't trip the "no setState in effects" rule the resume logic
  // above was rewritten to avoid.
  useEffect(() => {
    if (resumeId) clearPendingAction(resumeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  const durationMins = DISCOVERY_CLASS_DURATION_MINS;

  // Real, duration-aware slots for the selected date — checked against the
  // tutor's actual working hours, existing bookings of either kind, and
  // tutor-created blocks. Includes unavailable slots (rendered disabled)
  // so the student can see what's taken, not just what's open.
  const timeSlots = selectedDate ? getAvailableSlots(tutor, selectedDate, durationMins) : [];

  const canContinueStep1 = !!selectedDate && !!selectedTime;
  const canContinueStep2 = whatToLearn.trim().length > 0;

  async function goNext() {
    if (step === 0 && !canContinueStep1) return;
    if (step === 1 && !canContinueStep2) return;
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    if (!selectedDate || !selectedTime) return;

    // A guest can browse tutors and fill out this whole form freely — the
    // account is only required at the actual point of commitment, right
    // here. Their answers are preserved so signing in doesn't mean
    // starting over (see require-auth.ts / the resume effect above).
    const draft: DiscoverySessionDraft = {
      selectedDateISO: selectedDate.toISOString(),
      selectedTime,
      whatToLearn,
      academicLevel,
      goals,
      preferredLanguage,
    };
    const gate = requireAuthOrSaveDraft("discovery-session", draft, `${pathname}${offerId ? `?offerId=${offerId}` : ""}`);
    if (!gate.proceed) {
      router.push(gate.redirectUrl);
      return;
    }

    // Re-checked here (not just at the profile CTA) — a direct link to this
    // page must not let a student book a second free Discovery Session with
    // a tutor they've already had one with.
    if (hasCompletedFreeDiscovery(tutor.slug)) return;

    // Re-validated here, right before creating the session, against the
    // real current state of every other booking for this tutor — not just
    // the snapshot the calendar showed when the page first loaded. A
    // pre-approved slot was already explicitly agreed with the tutor, so it
    // skips this check (matching the Private "locked offer" flow).
    const storedTime = selectedTime.split("–")[0].trim();
    if (!isPreApprovedSlot) {
      const stillAvailable = getAvailableSlots(tutor, selectedDate, durationMins).some(
        (slot) => slot.state === "available" && slot.label === selectedTime
      );
      if (!stillAvailable) {
        setBookingError("This time is no longer available. Please select another time.");
        setSelectedTime(null);
        setStep(0);
        return;
      }
    }

    const tutorEligibility = tutorBookingEligibilityByName(tutor.name);
    if (!tutorEligibility.allowed) {
      setBookingError(bookingBlockedMessage("tutor", tutorEligibility));
      return;
    }
    const studentEligibility = studentBookingEligibilityByName(DISCOVERY_STUDENT_NAME);
    if (!studentEligibility.allowed) {
      setBookingError(bookingBlockedMessage("student", studentEligibility));
      return;
    }

    setSubmitting(true);
    setBookingError(null);
    const scheduledStart = combineDateAndTime(selectedDate, storedTime);
    const scheduledEnd = new Date(scheduledStart.getTime() + durationMins * 60 * 1000);
    try {
      const created = await addDiscoverySession({
        tutor: tutor.name,
        tutorImage: tutor.image,
        student: DISCOVERY_STUDENT_NAME,
        studentImage: DISCOVERY_STUDENT_IMAGE,
        subject: tutor.subject,
        date: selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: storedTime,
        durationMins,
        price: 0,
        status: "Upcoming",
        paymentStatus: "Released",
        conversionStatus: "Pending",
        scheduledStartAtISO: scheduledStart.toISOString(),
        scheduledEndAtISO: scheduledEnd.toISOString(),
        funnelStage: "Scheduled",
        tutorSelection: "Undecided",
        conversionOutcome: "Pending",
      });
      markFreeDiscoveryCompleted(tutor.slug);
      if (isPreApprovedSlot && offer) {
        respondToOffer(offer.id, (o) => ({ ...o, status: "Accepted" }), "student");
      }
      setBookingReference(created.bookingReference);
      setSubmitted(true);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "This time is no longer available. Please select another time.");
      setSelectedTime(null);
      setStep(0);
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  // `!submitted` matters here: a just-completed booking flips this same
  // flag to true via markFreeDiscoveryCompleted() moments before
  // setSubmitted(true), and this component re-renders on every state change
  // (checked fresh each time, not just once) — without excluding the
  // already-submitted case, that re-render would show "you already booked"
  // instead of the real confirmation screen below.
  if (!submitted && !isPreApprovedSlot && alreadyCompletedFreeDiscovery) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-muted">
          <CheckCircle2 className="size-9" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold text-ensena-ink">You&apos;ve already had your free Discovery Session with {tutor.name}</h1>
        <p className="mt-2 text-sm text-ensena-muted">Discovery Sessions are one free introduction per tutor. Ready to continue? Book a regular lesson instead.</p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
          <Button nativeButton={false} render={<Link href={`/find-teachers/${tutor.slug}/book`} />} className="h-11 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            Book a Lesson with {tutor.name.split(" ")[0]}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={`/find-teachers/${tutor.slug}`} />} className="h-11 flex-1 rounded-full border-ensena-border text-sm font-semibold text-ensena-ink">
            Back to Profile
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success">
          <CheckCircle2 className="size-9" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold text-ensena-ink">Discovery Session Booked!</h1>
        <p className="mt-2 text-sm text-ensena-muted">
          Your {durationMins}-minute Discovery Session with {tutor.name} is confirmed for{" "}
          {selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {selectedTime}.
        </p>
        {bookingReference && (
          <span className="mt-3 rounded-full bg-ensena-bg-soft px-4 py-1.5 font-mono text-sm font-semibold tracking-wide text-ensena-ink">
            {bookingReference}
          </span>
        )}

        <div className="mt-6 w-full rounded-2xl border border-ensena-border p-5 text-left">
          <div className="flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
              <Image src={tutor.image} alt={tutor.name} fill sizes="48px" className="object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ensena-ink">{tutor.name}</p>
              <p className="text-xs text-ensena-muted">{tutor.subjectTitle}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-ensena-border pt-4 text-sm">
            <div className="flex justify-between text-ensena-muted"><span>Date</span><span className="font-medium text-ensena-ink">{selectedDate?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
            <div className="flex justify-between text-ensena-muted"><span>Time</span><span className="font-medium text-ensena-ink">{selectedTime}</span></div>
            <div className="flex justify-between text-ensena-muted"><span>Duration</span><span className="font-medium text-ensena-ink">{durationMins} minutes</span></div>
            <div className="flex justify-between text-ensena-muted"><span>Price</span><span className="font-medium text-ensena-success">Free</span></div>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-ensena-bg-soft p-3 text-xs text-ensena-muted">
            <Video className="mt-0.5 size-3.5 shrink-0 text-ensena-primary" />
            Your virtual classroom link will appear in My Classes shortly before your session starts.
          </p>
        </div>

        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
          <Button nativeButton={false} render={<Link href="/student-dashboard/lessons" />} className="h-11 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            Go to My Classes
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={`/find-teachers/${tutor.slug}`} />} className="h-11 flex-1 rounded-full border-ensena-border text-sm font-semibold text-ensena-ink">
            Back to Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-ensena-border p-6">
          <div className="flex items-start gap-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full">
              <Image src={tutor.image} alt={tutor.name} fill sizes="64px" className="object-cover" />
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                {tutor.name} {isTutorVerifiedByName(tutor.name) && <BadgeCheck className="size-4 text-ensena-primary" />}
              </p>
              <p className="text-xs text-ensena-muted">{tutor.subjectTitle}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-ensena-ink">
                <Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews} reviews)
              </p>
            </div>
            <div className="ml-auto rounded-xl bg-ensena-primary/5 px-4 py-2 text-right">
              <p className="text-xs text-ensena-muted">Discovery Session</p>
              <p className="text-sm font-semibold text-ensena-success">Free / {durationMins} min</p>
            </div>
          </div>

          {isPreApprovedSlot && selectedDate && (
            <div className="mt-4 rounded-xl border-2 border-ensena-primary/30 bg-ensena-primary/5 p-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-primary">
                <CheckCircle2 className="size-4" /> Pre-approved by {tutor.name.split(" ")[0]}
              </p>
              <p className="mt-1 text-xs text-ensena-ink">
                {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {selectedTime}. This time is already agreed, just confirm your details below.
              </p>
            </div>
          )}

          {step === 0 && (
            <section className="mt-6 border-t border-ensena-border pt-6">
              <h2 className="font-heading text-lg font-semibold text-ensena-ink">1. Choose Date &amp; Time</h2>
              <p className="text-sm text-ensena-muted">Pick a time that works for your first meeting with {tutor.name.split(" ")[0]}.</p>

              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-[1.2fr_1fr]">
                <div>
                  <StartDateCalendar
                    tutor={tutor}
                    durationMinutes={durationMins}
                    selectedDate={selectedDate}
                    onSelectDate={(date) => { setSelectedDate(date); setSelectedTime(null); }}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-ensena-ink">
                    Available times
                    {selectedDate && ` for ${selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`}
                  </h3>
                  {selectedDate ? (
                    timeSlots.length === 0 ? (
                      <p className="mt-2 text-sm text-ensena-muted">No availability on this date.</p>
                    ) : (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot.label}
                            type="button"
                            disabled={slot.state !== "available"}
                            onClick={() => setSelectedTime(slot.label)}
                            className={cn(
                              "rounded-lg border px-2 py-1.5 text-xs font-medium",
                              selectedTime === slot.label
                                ? "border-ensena-primary bg-ensena-primary text-white"
                                : slot.state === "available"
                                  ? "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                                  : "cursor-not-allowed border-ensena-border text-ensena-border line-through"
                            )}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="mt-2 text-sm text-ensena-muted">Select a date to see available times.</p>
                  )}
                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Discovery Sessions are a one-time introduction, perfect for first-time students.
                  </p>
                </div>
              </div>
              {bookingError && (
                <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{bookingError}</p>
              )}
            </section>
          )}

          {step === 1 && (
            <section className="mt-6 border-t border-ensena-border pt-6">
              <h2 className="font-heading text-lg font-semibold text-ensena-ink">2. Tell Your Tutor</h2>
              <p className="text-sm text-ensena-muted">Help {tutor.name.split(" ")[0]} prepare for your session.</p>

              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <label className="text-sm font-medium text-ensena-ink">What do you want to learn? *</label>
                  <input
                    value={whatToLearn}
                    onChange={(e) => setWhatToLearn(e.target.value)}
                    placeholder={`e.g. Struggling with ${tutor.subject} exam prep`}
                    className="mt-1.5 h-11 w-full rounded-xl border border-ensena-border px-3.5 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-ensena-ink">Academic level</label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {academicLevelOptions.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setAcademicLevel(level)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                          academicLevel === level ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-ensena-ink">Your goals</label>
                  <textarea
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    rows={4}
                    placeholder="Tell your tutor a bit more about what you'd like to achieve…"
                    className="mt-1.5 w-full rounded-xl border border-ensena-border p-3.5 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-ensena-ink">Preferred language</label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-ensena-border px-3.5 text-sm"
                  >
                    {tutor.languages.map((lang) => (<option key={lang}>{lang}</option>))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-ensena-ink">Attach a file (optional)</label>
                  <label className="mt-1.5 flex h-11 w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ensena-border px-3.5 text-sm text-ensena-muted hover:bg-ensena-bg-soft">
                    <Paperclip className="size-4" />
                    {fileName ?? "Upload homework, syllabus or notes"}
                    <input type="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
                  </label>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="mt-6 border-t border-ensena-border pt-6">
              <h2 className="font-heading text-lg font-semibold text-ensena-ink">3. Review &amp; Confirm</h2>
              <p className="text-sm text-ensena-muted">Confirm the details below before booking.</p>

              <div className="mt-4 flex flex-col gap-1.5 rounded-xl bg-ensena-bg-soft p-4 text-sm">
                <div className="flex justify-between text-ensena-muted"><span>Date</span><span className="font-medium text-ensena-ink">{selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span></div>
                <div className="flex justify-between text-ensena-muted"><span>Time</span><span className="font-medium text-ensena-ink">{selectedTime}</span></div>
                <div className="flex justify-between text-ensena-muted"><span>Duration</span><span className="font-medium text-ensena-ink">{durationMins} minutes</span></div>
                <div className="flex justify-between text-ensena-muted"><span>What to learn</span><span className="max-w-[60%] text-right font-medium text-ensena-ink">{whatToLearn}</span></div>
                <div className="flex justify-between text-ensena-muted"><span>Academic level</span><span className="font-medium text-ensena-ink">{academicLevel}</span></div>
                <div className="flex justify-between text-ensena-muted"><span>Language</span><span className="font-medium text-ensena-ink">{preferredLanguage}</span></div>
                <div className="flex justify-between border-t border-ensena-border pt-1.5 text-ensena-muted"><span>Price</span><span className="font-semibold text-ensena-success">Free</span></div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ensena-muted">
                <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-ensena-success" /> No payment required</span>
                <span className="flex items-center gap-1.5"><Lock className="size-3.5 text-ensena-success" /> Secure booking</span>
                <span className="flex items-center gap-1.5"><Building2 className="size-3.5 text-ensena-success" /> First-time students only</span>
              </div>
            </section>
          )}

          <div className="mt-6 hidden items-center justify-between border-t border-ensena-border pt-6 sm:flex">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="flex items-center gap-1.5 rounded-full border border-ensena-border px-4 py-2 text-sm font-medium text-ensena-ink disabled:opacity-40"
            >
              <ChevronLeft className="size-4" /> Back
            </button>
            <Button
              onClick={goNext}
              disabled={(step === 0 && !canContinueStep1) || (step === 1 && !canContinueStep2)}
              loading={step === 2 && submitting}
              className="h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:pointer-events-none disabled:opacity-60"
            >
              {step < 2 ? "Continue" : submitting ? "Booking…" : "Book Discovery Session"}
            </Button>
          </div>
        </div>

        {/* Sticky booking summary sidebar */}
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="rounded-2xl border border-ensena-border p-5 shadow-sm">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Booking Summary</h2>

            <div className="mt-4 flex items-center gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
                <Image src={tutor.image} alt={tutor.name} fill sizes="48px" className="object-cover" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ensena-ink">{tutor.name}</p>
                <p className="flex items-center gap-1 text-xs text-ensena-muted">
                  <Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews})
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5 border-t border-ensena-border pt-4 text-sm">
              <div className="flex justify-between text-ensena-muted"><span>Session type</span><span className="font-medium text-ensena-ink">Discovery Session</span></div>
              <div className="flex justify-between text-ensena-muted"><span>Subject</span><span className="font-medium text-ensena-ink">{tutor.subject}</span></div>
              <div className="flex justify-between text-ensena-muted">
                <span className="flex items-center gap-1"><Calendar className="size-3" /> Date</span>
                <span className="font-medium text-ensena-ink">{selectedDate ? selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Not selected"}</span>
              </div>
              <div className="flex justify-between text-ensena-muted">
                <span className="flex items-center gap-1"><Clock className="size-3" /> Time</span>
                <span className="font-medium text-ensena-ink">{selectedTime ?? "Not selected"}</span>
              </div>
              <div className="flex justify-between text-ensena-muted"><span>Duration</span><span className="font-medium text-ensena-ink">{durationMins} minutes</span></div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3 text-base font-semibold">
              <span className="text-ensena-ink">Price</span>
              <span className="text-ensena-success">Free</span>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-ensena-success/10 p-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ensena-success" />
              <p className="text-xs text-ensena-ink">Free Discovery Session: no payment or card required.</p>
            </div>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ensena-muted">
              <Lock className="size-3.5" /> Secure · Encrypted · 100% Safe
            </p>

            <Button
              onClick={goNext}
              disabled={(step === 0 && !canContinueStep1) || (step === 1 && !canContinueStep2)}
              loading={step === 2 && submitting}
              className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:pointer-events-none disabled:opacity-60"
            >
              {step < 2 ? "Continue →" : submitting ? "Booking…" : "Book Discovery Session"}
            </Button>
            {step > 0 && (
              <button type="button" onClick={goBack} className="mt-2 w-full text-center text-xs font-medium text-ensena-muted hover:text-ensena-ink">
                ← Back
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-ensena-border bg-ensena-surface p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:hidden">
        <div>
          <p className="text-xs text-ensena-muted">Price</p>
          <p className="text-lg font-semibold text-ensena-success">Free</p>
        </div>
        <Button
          onClick={goNext}
          disabled={(step === 0 && !canContinueStep1) || (step === 1 && !canContinueStep2)}
          loading={step === 2 && submitting}
          className="h-11 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:pointer-events-none disabled:opacity-60"
        >
          {step < 2 ? "Continue" : submitting ? "Booking…" : "Book Discovery Session"}
        </Button>
      </div>
    </div>
  );
}
