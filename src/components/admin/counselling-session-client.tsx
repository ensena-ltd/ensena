"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  Copy,
  FileText,
  GraduationCap,
  Lightbulb,
  Star,
  Target,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiveTutorRating } from "@/components/shared/live-tutor-rating";
import { useReviews } from "@/hooks/use-reviews";
import { computeEffectiveTutorRating } from "@/lib/reviews-store";
import {
  counsellingStatusStyles,
  formatCounsellingDisplayId,
  initialCounsellingAppointments,
  outcomeOptionsFor,
  studentSlug,
  type CounsellingActionPlanTask,
  type CounsellingAppointment,
  type CounsellingRecommendation,
  type SessionOutcome,
} from "@/lib/admin-counselling-data";
import { formatNaira } from "@/lib/format";
import { groupClassListings } from "@/lib/group-classes-data";
import { tutorListings } from "@/lib/tutors";
import { cn } from "@/lib/utils";

function Card({ title, icon: Icon, children }: { title: string; icon?: typeof Target; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
        {Icon && <Icon className="size-4 text-ensena-primary" />} {title}
      </h2>
      {children}
    </div>
  );
}

function RecommendationSummary({ recommendation }: { recommendation: CounsellingRecommendation }) {
  const tutor = recommendation.tutorSlug ? tutorListings.find((t) => t.slug === recommendation.tutorSlug) : undefined;
  const groupClass = recommendation.groupClassSlug ? groupClassListings.find((c) => c.slug === recommendation.groupClassSlug) : undefined;

  return (
    <div className="rounded-xl bg-ensena-bg-soft p-3 text-sm">
      <p className="text-ensena-ink">{recommendation.message}</p>
      {tutor && (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-lg bg-white p-2.5">
          <span className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={tutor.image} alt={tutor.name} fill sizes="36px" className="object-cover" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ensena-ink">{tutor.name}</p>
            <p className="truncate text-[11px] text-ensena-muted">{tutor.subject} · {formatNaira(tutor.price)}/hr</p>
          </div>
          <Link href={`/find-teachers/${tutor.slug}`} className="shrink-0 text-[11px] font-semibold text-ensena-primary hover:underline">View →</Link>
        </div>
      )}
      {groupClass && (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-lg bg-white p-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Users className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ensena-ink">{groupClass.title}</p>
            <p className="truncate text-[11px] text-ensena-muted">{groupClass.levelBadge} · {formatNaira(groupClass.price)}/session</p>
          </div>
          <Link href={`/group-classes/${groupClass.slug}`} className="shrink-0 text-[11px] font-semibold text-ensena-primary hover:underline">View →</Link>
        </div>
      )}
    </div>
  );
}

export function CounsellingSessionClient({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enteredRoom = searchParams.get("entered") === "1";
  const [appointments, setAppointments] = useState<CounsellingAppointment[]>(initialCounsellingAppointments);
  const rawAppointment = appointments.find((a) => a.id === appointmentId);

  // Returning from the real classroom (a separate route with its own,
  // independently-seeded session render — no live sync between the two)
  // still needs this page to reflect that the call actually happened, even
  // if "Mark Intake Reviewed" was clicked on this same, since-unmounted
  // page just before entering (that local state doesn't survive the round
  // trip either) — actually entering the room implies review happened one
  // way or another. A pure derived override rather than writing it into
  // state avoids any "sync an effect to a URL param on mount" timing issues.
  const appointment =
    rawAppointment && enteredRoom && (rawAppointment.status === "Upcoming" || rawAppointment.status === "New Booking")
      ? { ...rawAppointment, status: "In Progress" as const, intakeReviewed: true }
      : rawAppointment;

  const [copied, setCopied] = useState(false);
  const [discussed, setDiscussed] = useState("");
  const [outcome, setOutcome] = useState<SessionOutcome | "">("");
  const [selectedTutorSlug, setSelectedTutorSlug] = useState<string | null>(null);
  const [selectedGroupClassSlug, setSelectedGroupClassSlug] = useState<string | null>(null);
  const [recommendationMessage, setRecommendationMessage] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [planTasks, setPlanTasks] = useState(["", "", ""]);
  const [followUpNeeded, setFollowUpNeeded] = useState<"yes" | "no" | null>(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [showActionPlanEditor, setShowActionPlanEditor] = useState(false);
  const [editPlanTitle, setEditPlanTitle] = useState("");
  const [editPlanTasks, setEditPlanTasks] = useState(["", "", ""]);
  const reviews = useReviews();

  if (!appointment) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This counselling appointment could not be found.</p>
        <Link href="/admin/counsellors" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Counselling</Link>
      </div>
    );
  }

  // The `if (!appointment)` guard above can't narrow inside the function
  // declarations below (hoisting), so bind a definitely-typed alias once.
  const current = appointment;
  const displayId = formatCounsellingDisplayId(current.id);
  const outcomeOptions = outcomeOptionsFor(current.intake.concerns);

  const matchingTutors = tutorListings
    .filter((t) => current.intake.subjects.includes(t.subject))
    .sort((a, b) => computeEffectiveTutorRating(b.name, b.rating, b.reviews).rating - computeEffectiveTutorRating(a.name, a.rating, a.reviews).rating)
    .slice(0, 5);
  const matchingGroupClasses = groupClassListings
    .filter((c) => current.intake.subjects.includes(c.subject))
    .sort((a, b) => computeEffectiveTutorRating(b.tutorName, b.rating, b.reviews).rating - computeEffectiveTutorRating(a.tutorName, a.rating, a.reviews).rating)
    .slice(0, 5);
  void reviews; // subscribes this component to review changes so the sorts/badges above stay live

  function update(patch: Partial<CounsellingAppointment>) {
    setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, ...patch } : a)));
  }

  function copyId() {
    navigator.clipboard?.writeText(displayId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function markReviewed() {
    update({ status: "Upcoming", intakeReviewed: true });
  }

  function startSession() {
    update({ status: "In Progress" });
    router.push(`/admin/counsellors/${current.id}/session`);
  }

  function completeSession() {
    if (!outcome) return;

    let recommendation: CounsellingRecommendation | undefined;
    if (outcome === "Tutor recommended" && selectedTutorSlug) {
      recommendation = { type: "tutor", message: recommendationMessage.trim(), tutorSlug: selectedTutorSlug };
    } else if (outcome === "Group class recommended" && selectedGroupClassSlug) {
      recommendation = { type: "group-class", message: recommendationMessage.trim(), groupClassSlug: selectedGroupClassSlug };
    } else if (outcome === "Study plan recommended" && planTasks.some((t) => t.trim())) {
      recommendation = { type: "study-plan", message: recommendationMessage.trim() || "Follow this plan to stay on track before your next check-in." };
    } else if (outcome === "Academic guidance provided" && recommendationMessage.trim()) {
      recommendation = { type: "study-plan", message: recommendationMessage.trim() };
    }

    let actionPlan = current.actionPlan;
    if (outcome === "Study plan recommended" && planTasks.some((t) => t.trim())) {
      const tasks: CounsellingActionPlanTask[] = planTasks
        .filter((t) => t.trim())
        .map((t, i) => ({ label: t.trim(), status: i === 0 ? "In Progress" : "Upcoming" }));
      const createdDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      actionPlan = { title: planTitle.trim() || `${current.student.split(" ")[0]}'s Action Plan`, createdDate, tasks };
    }

    let followUp = current.followUp;
    const nextAppointments: CounsellingAppointment[] = [];
    if (followUpNeeded === "yes" && followUpDate) {
      const formattedDate = new Date(`${followUpDate}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const followUpId = `cns-${appointments.length + 1}`;
      followUp = { needed: true, date: formattedDate, appointmentId: followUpId };
      nextAppointments.push({
        ...current,
        id: followUpId,
        status: "Upcoming",
        dateISO: followUpDate,
        dateLabel: formattedDate,
        bookedLabel: "Just now",
        bookedAgo: "Just now",
        sessionNotes: undefined,
        outcome: undefined,
        recommendation: undefined,
        actionPlan,
        followUp: undefined,
      });
    } else if (followUpNeeded === "no") {
      followUp = { needed: false };
    }

    setAppointments((prev) => [
      ...prev.map((a) => (a.id === appointmentId ? { ...a, status: (followUpNeeded === "yes" ? "Follow-up" : "Completed") as CounsellingAppointment["status"], sessionNotes: { discussed }, outcome, recommendation, actionPlan, followUp } : a)),
      ...nextAppointments,
    ]);
  }

  function toggleTask(taskIndex: number) {
    if (!current.actionPlan) return;
    const tasks = current.actionPlan.tasks.map((t, i) => (i === taskIndex ? { ...t, status: t.status === "Done" ? ("Upcoming" as const) : ("Done" as const) } : t));
    update({ actionPlan: { ...current.actionPlan, tasks } });
  }

  function saveActionPlan() {
    const tasks: CounsellingActionPlanTask[] = editPlanTasks
      .filter((t) => t.trim())
      .map((t, i) => ({ label: t.trim(), status: i === 0 ? "In Progress" : "Upcoming" }));
    if (tasks.length === 0) return;
    const createdDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    update({ actionPlan: { title: editPlanTitle.trim() || `${current.student.split(" ")[0]}'s Action Plan`, createdDate, tasks } });
    setShowActionPlanEditor(false);
  }

  const isPre = current.status === "New Booking" || current.status === "Upcoming";
  const isInProgress = current.status === "In Progress";
  const isDone = current.status === "Completed" || current.status === "Follow-up" || current.status === "Cancelled";

  const canComplete =
    !!outcome &&
    (outcome !== "Tutor recommended" || !!selectedTutorSlug) &&
    (outcome !== "Group class recommended" || !!selectedGroupClassSlug) &&
    (followUpNeeded !== "yes" || !!followUpDate);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href="/admin/counsellors" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
          <ChevronLeft className="size-4" /> Back to Counselling
        </Link>
        <div className="rounded-xl border border-ensena-border bg-ensena-surface px-4 py-2.5">
          <p className="text-[11px] text-ensena-muted">Appointment ID</p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="font-mono text-sm font-semibold text-ensena-ink">{displayId}</p>
            <button type="button" onClick={copyId} aria-label="Copy Appointment ID" className="text-ensena-muted hover:text-ensena-primary"><Copy className="size-3.5" /></button>
          </div>
          {copied && <p className="text-[10px] text-ensena-success">Copied!</p>}
        </div>
      </div>

      {/* Header */}
      <div className="mt-3 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-full"><Image src={current.studentImage} alt={current.student} fill sizes="56px" className="object-cover" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Counselling Session</p>
              <h1 className="font-heading text-xl font-semibold text-ensena-ink">{current.student}</h1>
              <p className="text-sm text-ensena-muted">{current.level} · {current.exam}</p>
            </div>
          </div>
          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", counsellingStatusStyles[current.status])}>
            <span className="size-1.5 rounded-full bg-current" /> {current.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="flex items-center gap-1 text-[11px] text-ensena-muted"><Calendar className="size-3" /> Date</p><p className="mt-0.5 text-sm font-semibold text-ensena-ink">{current.dateLabel}</p></div>
          <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="flex items-center gap-1 text-[11px] text-ensena-muted"><Clock className="size-3" /> Time</p><p className="mt-0.5 text-sm font-semibold text-ensena-ink">{current.time} – {current.endTime}</p></div>
          <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="flex items-center gap-1 text-[11px] text-ensena-muted"><Video className="size-3" /> Type</p><p className="mt-0.5 text-sm font-semibold text-ensena-ink">Video Call</p></div>
          <div className="rounded-xl bg-ensena-bg-soft p-3">
            <p className="text-[11px] text-ensena-muted">Student Profile</p>
            <Link href={`/admin/counsellors/students/${studentSlug(current.student)}`} className="mt-0.5 block truncate text-sm font-semibold text-ensena-primary hover:underline">View history →</Link>
          </div>
        </div>

        {(isPre || isInProgress) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {current.status === "New Booking" && (
              <Button onClick={markReviewed} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover">Mark Intake Reviewed</Button>
            )}
            {current.status === "Upcoming" && (
              <Button onClick={startSession} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover">
                <Video className="size-4" /> Enter Session
              </Button>
            )}
            {isInProgress && (
              <span className="flex h-10 cursor-default items-center gap-2 rounded-full bg-emerald-100 px-5 text-sm font-semibold text-emerald-700">
                <span className="size-2 animate-pulse rounded-full bg-emerald-600" /> Session in progress
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {/* Student's Intake */}
          <Card title="Student's Intake" icon={Target}>
            <div className="mt-3 flex flex-col gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">What the student needs help with</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {current.intake.concerns.map((c) => (
                    <span key={c} className="rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">{c}</span>
                  ))}
                  {current.intake.concerns.length === 0 && <span className="text-xs text-ensena-muted">Not specified.</span>}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Student&apos;s message</p>
                <p className="mt-1.5 rounded-xl bg-ensena-bg-soft p-3 text-ensena-ink">&ldquo;{current.intake.message}&rdquo;</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div><p className="text-xs text-ensena-muted">Level</p><p className="font-medium text-ensena-ink">{current.intake.academicLevel}</p></div>
                <div><p className="text-xs text-ensena-muted">Subjects</p><p className="font-medium text-ensena-ink">{current.intake.subjects.join(", ") || "—"}</p></div>
                <div><p className="text-xs text-ensena-muted">Exam</p><p className="font-medium text-ensena-ink">{current.intake.examGoal}</p></div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Goal</p>
                <p className="mt-1.5 text-ensena-ink">{current.intake.goalText || "Not specified."}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Preferred support</p>
                <p className="mt-1.5 font-medium text-ensena-ink">{current.intake.supportPreferences.join(", ") || "Not specified."}</p>
              </div>
            </div>
          </Card>

          {/* Intake Summary */}
          <Card title="Intake Summary" icon={FileText}>
            <p className="mt-3 rounded-xl bg-ensena-primary/5 p-3 text-sm text-ensena-ink">{current.aiSummary.summary}</p>
            {current.aiSummary.suggestedTopics.length > 0 && (
              <div className="mt-3">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ensena-muted"><Lightbulb className="size-3.5" /> Suggested areas to discuss</p>
                <ul className="mt-1.5 flex flex-col gap-1 text-sm text-ensena-ink">
                  {current.aiSummary.suggestedTopics.map((t) => (
                    <li key={t} className="flex items-start gap-1.5"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-ensena-muted" /> {t}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Post-session: Complete Counselling Session */}
          {isInProgress && (
            <Card title="Complete Counselling Session">
              <div className="mt-3 flex flex-col gap-4 text-sm">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ensena-muted">What was discussed? <span className="font-normal text-ensena-muted">— Private, not visible to student</span></span>
                  <textarea value={discussed} onChange={(e) => setDiscussed(e.target.value)} rows={4} placeholder="Write your private counselling notes…" className="rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary" />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ensena-muted">Session Outcome</span>
                  <select
                    value={outcome}
                    onChange={(e) => {
                      setOutcome(e.target.value as SessionOutcome);
                      setSelectedTutorSlug(null);
                      setSelectedGroupClassSlug(null);
                      setRecommendationMessage("");
                    }}
                    className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
                  >
                    <option value="">Select an outcome</option>
                    {outcomeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>

                {outcome === "Tutor recommended" && (
                  <div>
                    <p className="text-xs font-medium text-ensena-muted">Choose a tutor to recommend</p>
                    <div className="mt-1.5 flex flex-col gap-1.5">
                      {matchingTutors.map((t) => (
                        <button
                          key={t.slug}
                          type="button"
                          onClick={() => {
                            setSelectedTutorSlug(t.slug);
                            setRecommendationMessage(`${t.name} specializes in ${t.subject} and can help you prepare for ${current.exam !== "—" ? current.exam : "your goals"}.`);
                          }}
                          className={cn("flex items-center gap-2.5 rounded-xl border p-2.5 text-left", selectedTutorSlug === t.slug ? "border-ensena-primary bg-ensena-primary/5" : "border-ensena-border hover:bg-ensena-bg-soft")}
                        >
                          <span className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={t.image} alt={t.name} fill sizes="36px" className="object-cover" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-ensena-ink">{t.name}</p>
                            <p className="truncate text-[11px] text-ensena-muted">{t.subject} · {formatNaira(t.price)}/hr</p>
                          </div>
                          <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-ensena-ink">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            <LiveTutorRating name={t.name} rating={t.rating} reviews={t.reviews}>{(live) => live.rating}</LiveTutorRating>
                          </span>
                        </button>
                      ))}
                      {matchingTutors.length === 0 && <p className="text-xs text-ensena-muted">No tutors found for {current.intake.subjects.join(", ") || "this subject"} yet.</p>}
                    </div>
                    {selectedTutorSlug && (
                      <textarea value={recommendationMessage} onChange={(e) => setRecommendationMessage(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary" />
                    )}
                  </div>
                )}

                {outcome === "Group class recommended" && (
                  <div>
                    <p className="text-xs font-medium text-ensena-muted">Choose a group class to recommend</p>
                    <div className="mt-1.5 flex flex-col gap-1.5">
                      {matchingGroupClasses.map((c) => (
                        <button
                          key={c.slug}
                          type="button"
                          onClick={() => {
                            setSelectedGroupClassSlug(c.slug);
                            setRecommendationMessage(`This class covers ${c.subject} for ${c.levelBadge} students and may be a good fit for your goals.`);
                          }}
                          className={cn("flex items-center gap-2.5 rounded-xl border p-2.5 text-left", selectedGroupClassSlug === c.slug ? "border-ensena-primary bg-ensena-primary/5" : "border-ensena-border hover:bg-ensena-bg-soft")}
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Users className="size-4" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-ensena-ink">{c.title}</p>
                            <p className="truncate text-[11px] text-ensena-muted">{c.levelBadge} · {formatNaira(c.price)}/session · {c.maxSeats - c.enrolled} seats left</p>
                          </div>
                          <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-ensena-ink">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            <LiveTutorRating name={c.tutorName} rating={c.rating} reviews={c.reviews}>{(live) => live.rating}</LiveTutorRating>
                          </span>
                        </button>
                      ))}
                      {matchingGroupClasses.length === 0 && <p className="text-xs text-ensena-muted">No group classes found for {current.intake.subjects.join(", ") || "this subject"} yet.</p>}
                    </div>
                    {selectedGroupClassSlug && (
                      <textarea value={recommendationMessage} onChange={(e) => setRecommendationMessage(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary" />
                    )}
                  </div>
                )}

                {outcome === "Study plan recommended" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-ensena-muted">Create a simple action plan</p>
                    <input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} placeholder={`${current.student.split(" ")[0]}'s Action Plan`} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                    {planTasks.map((t, i) => (
                      <input key={i} value={t} onChange={(e) => setPlanTasks((prev) => prev.map((p, pi) => (pi === i ? e.target.value : p)))} placeholder={`Task ${i + 1}`} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                    ))}
                    <textarea value={recommendationMessage} onChange={(e) => setRecommendationMessage(e.target.value)} rows={2} placeholder="A short note for the student about this plan…" className="w-full rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary" />
                  </div>
                )}

                {outcome === "Academic guidance provided" && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-ensena-muted">Guidance for the student</span>
                    <textarea value={recommendationMessage} onChange={(e) => setRecommendationMessage(e.target.value)} rows={3} placeholder="Summarize the guidance you gave, in your own words for the student to see…" className="rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary" />
                  </label>
                )}

                <div>
                  <p className="text-xs font-medium text-ensena-muted">Does this student need follow-up?</p>
                  <div className="mt-1.5 flex gap-4">
                    <label className="flex items-center gap-1.5 text-sm text-ensena-ink"><input type="radio" name="followup" checked={followUpNeeded === "no"} onChange={() => setFollowUpNeeded("no")} /> No</label>
                    <label className="flex items-center gap-1.5 text-sm text-ensena-ink"><input type="radio" name="followup" checked={followUpNeeded === "yes"} onChange={() => setFollowUpNeeded("yes")} /> Yes</label>
                  </div>
                  {followUpNeeded === "yes" && (
                    <label className="mt-2 flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-ensena-muted">Follow-up date</span>
                      <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="h-10 w-48 rounded-lg border border-ensena-border px-3 text-sm" />
                    </label>
                  )}
                </div>

                <Button disabled={!canComplete} onClick={completeSession} className="h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-40">
                  Complete Session
                </Button>
              </div>
            </Card>
          )}

          {isDone && current.sessionNotes && (
            <Card title="Session Notes">
              <div className="mt-3 flex flex-col gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Private notes</p>
                  <p className="mt-1 text-ensena-ink">{current.sessionNotes.discussed}</p>
                </div>
                {current.outcome && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Outcome</p>
                    <span className="mt-1 inline-block rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">{current.outcome}</span>
                  </div>
                )}
                {current.followUp?.needed && <p className="text-xs text-ensena-muted">Follow-up scheduled for {current.followUp.date}.</p>}
              </div>
            </Card>
          )}

          {/* Action Plan */}
          {isDone && (
            <Card title="Action Plan">
              {current.actionPlan ? (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-ensena-ink">{current.actionPlan.title}</p>
                  <ol className="mt-2.5 flex flex-col gap-2">
                    {current.actionPlan.tasks.map((t, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm">
                        <button type="button" onClick={() => toggleTask(i)} aria-label={t.status === "Done" ? "Mark not done" : "Mark done"}>
                          {t.status === "Done" ? <CheckCircle2 className="size-4 shrink-0 text-ensena-success" /> : t.status === "In Progress" ? <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-100"><span className="size-1.5 rounded-full bg-amber-600" /></span> : <Circle className="size-4 shrink-0 text-ensena-border" />}
                        </button>
                        <span className="text-ensena-ink">{i + 1}. {t.label}</span>
                        <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold", t.status === "Done" ? "bg-emerald-100 text-emerald-700" : t.status === "In Progress" ? "bg-amber-100 text-amber-700" : "bg-ensena-bg-soft text-ensena-muted")}>{t.status}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : showActionPlanEditor ? (
                <div className="mt-3 flex flex-col gap-2.5">
                  <input value={editPlanTitle} onChange={(e) => setEditPlanTitle(e.target.value)} placeholder={`${current.student.split(" ")[0]}'s Action Plan`} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                  {editPlanTasks.map((t, i) => (
                    <input key={i} value={t} onChange={(e) => setEditPlanTasks((prev) => prev.map((p, pi) => (pi === i ? e.target.value : p)))} placeholder={`Task ${i + 1}`} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                  ))}
                  <div className="mt-1 flex gap-2">
                    <Button variant="outline" onClick={() => setShowActionPlanEditor(false)} className="h-9 flex-1 rounded-full border-ensena-border text-xs font-medium">Cancel</Button>
                    <Button onClick={saveActionPlan} className="h-9 flex-1 rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-ensena-primary-hover">Save Plan</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-sm text-ensena-muted">No action plan yet. Keep it simple; a few concrete next steps is enough.</p>
                  <Button variant="outline" onClick={() => setShowActionPlanEditor(true)} className="mt-2.5 h-9 rounded-full border-ensena-border text-xs font-medium">Create Action Plan</Button>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Session">
            <dl className="mt-3 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ensena-muted">Counsellor</dt><dd className="font-medium text-ensena-ink">Benny</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Session type</dt><dd className="font-medium text-ensena-ink">Video Call</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Duration</dt><dd className="font-medium text-ensena-ink">{current.durationMinutes} minutes</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Cost</dt><dd className="font-medium text-ensena-success">Free</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Date</dt><dd className="font-medium text-ensena-ink">{current.dateLabel}</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Time</dt><dd className="font-medium text-ensena-ink">{current.time} – {current.endTime}</dd></div>
            </dl>
          </Card>

          {current.recommendation && isDone && (
            <Card title="Recommended Support" icon={GraduationCap}>
              <div className="mt-3"><RecommendationSummary recommendation={current.recommendation} /></div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
