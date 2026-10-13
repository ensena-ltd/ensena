"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  GraduationCap,
  HelpCircle,
  Info,
  Lightbulb,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Star,
  Target,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiveTutorRating } from "@/components/shared/live-tutor-rating";
import { ManageLessonSheet } from "@/components/shared/manage-lesson/manage-lesson-sheet";
import { ReportProblemModal } from "@/components/shared/report-problem-modal";
import { useNowMs } from "@/hooks/use-now-ms";
import { counsellingStatusStyles, formatCounsellingDisplayId, getCounsellingTimeRange, initialCounsellingAppointments, type CounsellingAppointment } from "@/lib/admin-counselling-data";
import { canEnterClassroom, getClassEntryState, STUDENT_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { counsellor } from "@/lib/counsellor-data";
import { formatNaira } from "@/lib/format";
import { groupClassListings } from "@/lib/group-classes-data";
import type { ManageLessonAction, ManageLessonData } from "@/lib/manage-lesson-types";
import { tutorListings } from "@/lib/tutors";
import { cn } from "@/lib/utils";

const UPCOMING_LIKE: CounsellingAppointment["status"][] = ["New Booking", "Upcoming", "In Progress"];

function Card({ title, icon: Icon, action, children, className }: { title: string; icon?: typeof Target; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-2xl border border-ensena-border bg-ensena-surface p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
          {Icon && <Icon className="size-4 text-ensena-primary" />} {title}
        </h2>
        {action}
      </div>
      <div className="mt-3 flex-1">{children}</div>
    </div>
  );
}

function entryInfo(appt: CounsellingAppointment, nowMs: number): { enterable: boolean; hint: React.ReactNode | undefined } {
  const timeRange = getCounsellingTimeRange(appt);
  const entryState = timeRange ? getClassEntryState({ ...timeRange, role: "student", nowMs }) : null;
  const enterable = entryState ? canEnterClassroom(entryState) : false;
  const hint =
    entryState === "too-early" && timeRange
      ? entryOpensHint(timeRange.startMs - STUDENT_ENTRY_WINDOW_MS, nowMs, "Session")
      : entryState === "ended"
        ? "This session has ended"
        : undefined;
  return { enterable, hint };
}

function buildApptManageData(appt: CounsellingAppointment): ManageLessonData {
  return { sheetTitle: "Manage Session", title: `Counselling with ${counsellor.name}`, subtitle: appt.status, image: counsellor.image, statusLabel: appt.status, bookingRef: formatCounsellingDisplayId(appt.id), infoRows: [{ label: "Date", value: appt.dateLabel }, { label: "Time", value: `${appt.time} – ${appt.endTime}` }] };
}

export function MyCounsellingClient({ studentName }: { studentName: string }) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const nowMs = useNowMs();
  const [manageApptId, setManageApptId] = useState<string | null>(null);
  const [reportingApptId, setReportingApptId] = useState<string | null>(null);
  function buildApptManageActions(appt: CounsellingAppointment): ManageLessonAction[] {
    const { enterable } = entryInfo(appt, nowMs);
    const actions: ManageLessonAction[] = [];
    if (enterable) {
      actions.push({ key: "join", label: "Join Session", icon: Video, variant: "primary", onClick: () => { setManageApptId(null); router.push(`/student-dashboard/classroom/counselling/${appt.id}`); } });
    }
    actions.push({ key: "view", label: "View Details", icon: Calendar, onClick: () => { setManageApptId(null); router.push(`/student-dashboard/counselling/${appt.id}`); } });
    actions.push({ key: "message", label: `Message ${counsellor.name}`, icon: MessageSquare, onClick: () => { setManageApptId(null); router.push("/student-dashboard/messages"); } });
    actions.push({ key: "report", label: "Report a Problem", icon: Flag, variant: "danger", onClick: () => { setManageApptId(null); setReportingApptId(appt.id); } });
    return actions;
  }
  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast((cur) => (cur === m ? null : cur)), 2500);
  }

  const records = initialCounsellingAppointments
    .filter((a) => a.student === studentName)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">You haven&apos;t booked a counselling session yet.</p>
        <Link href="/counsellor" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">Speak to a Counsellor →</Link>
      </div>
    );
  }

  // The soonest upcoming/new-booking session, not the furthest-dated one.
  const upcomingSorted = [...records].filter((a) => UPCOMING_LIKE.includes(a.status)).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const upcoming = upcomingSorted[0];
  const nextFollowUp = upcomingSorted[1];
  const latest = records[0];
  const latestPlanOwner = records.find((a) => a.actionPlan);
  const latestPlan = latestPlanOwner?.actionPlan;
  const pastSessions = records.filter((a) => a.status === "Completed" || a.status === "Follow-up" || a.status === "Cancelled");
  const recommendationSource = records.find((a) => a.recommendation && a.recommendation.type !== "study-plan");
  const recommendation = recommendationSource?.recommendation;
  const recommendedTutor = recommendation?.tutorSlug ? tutorListings.find((t) => t.slug === recommendation.tutorSlug) : undefined;
  const recommendedClass = recommendation?.groupClassSlug ? groupClassListings.find((c) => c.slug === recommendation.groupClassSlug) : undefined;
  const otherTutorsHref = recommendedTutor ? `/find-teachers?subject=${encodeURIComponent(recommendedTutor.subject)}` : "/find-teachers";

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">My Counselling</h1>
      <p className="mt-1 text-sm text-ensena-muted">Your academic support with {counsellor.name}, Enseña {counsellor.role}.</p>

      {/* Upcoming Session banner */}
      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-bg-soft p-5 sm:p-6">
        {upcoming ? (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-full"><Image src={counsellor.image} alt={counsellor.name} fill sizes="56px" className="object-cover" /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ensena-success">Upcoming Session</p>
                <p className="font-heading text-lg font-semibold text-ensena-ink">{counsellor.name}</p>
                <p className="text-xs text-ensena-muted">Enseña {counsellor.role}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="size-3" /> {upcoming.status === "In Progress" ? "In Progress" : upcoming.status === "New Booking" ? "Booked" : "Confirmed"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 lg:gap-10">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><Calendar className="size-3.5" /> Date</p>
                <p className="mt-0.5 text-sm font-semibold text-ensena-ink">{upcoming.dateLabel}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><Clock className="size-3.5" /> Time</p>
                <p className="mt-0.5 text-sm font-semibold text-ensena-ink">{upcoming.time} – {upcoming.endTime} <span className="font-normal text-ensena-muted">({upcoming.durationMinutes} mins)</span></p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><Video className="size-3.5" /> Session Type</p>
                <p className="mt-0.5 text-sm font-semibold text-ensena-ink">Video Call</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:min-w-[200px]">
              {(() => {
                const { enterable, hint } = entryInfo(upcoming, nowMs);
                return (
                  <>
                    <Button
                      disabled={!enterable}
                      {...(enterable ? { nativeButton: false, render: <Link href={`/student-dashboard/classroom/counselling/${upcoming.id}`} /> } : {})}
                      className="h-11 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
                    >
                      <Video className="size-4" /> Enter Session
                    </Button>
                    {!enterable && hint && <p className="text-center text-xs font-medium text-ensena-primary">{hint}</p>}
                  </>
                );
              })()}
              <Button variant="outline" onClick={() => flash("Rescheduling a counselling session isn't available in this demo yet. Send Benny a message to arrange a new time.")} className="h-11 rounded-full border-ensena-border bg-ensena-surface text-sm font-medium">
                <Calendar className="size-4" /> Reschedule
              </Button>
              <div className="flex items-center justify-center gap-2">
                <Link href={`/student-dashboard/counselling/${upcoming.id}`} className="text-center text-xs font-semibold text-ensena-primary hover:underline">View Details →</Link>
                <button type="button" aria-label="More options" onClick={() => setManageApptId(upcoming.id)} className="flex size-7 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                  <MoreVertical className="size-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ensena-ink">No upcoming counselling session.</p>
              <p className="mt-0.5 text-sm text-ensena-muted">Your previous session with {counsellor.name} was on {latest.dateLabel}.</p>
            </div>
            <Button nativeButton={false} render={<Link href="/counsellor" />} className="h-10 shrink-0 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover">
              Book Another Session
            </Button>
          </div>
        )}
      </div>

      {/* Row: What You Told Benny | Benny's Recommendation | Your Action Plan */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="What You Told Benny"
          action={<button type="button" onClick={() => flash("Editing your intake form isn't available in this demo yet. Message Benny to update it.")} className="text-xs font-semibold text-ensena-primary hover:underline">Edit</button>}
        >
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-start gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600"><HelpCircle className="size-3.5" /></span>
              <div><p className="text-xs text-ensena-muted">Why you reached out</p><p className="font-medium text-ensena-ink">{latest.intake.concerns[0] ?? "General support"}</p></div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"><GraduationCap className="size-3.5" /></span>
              <div><p className="text-xs text-ensena-muted">Academic Level</p><p className="font-medium text-ensena-ink">{latest.intake.academicLevel}</p></div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><BookOpen className="size-3.5" /></span>
              <div><p className="text-xs text-ensena-muted">Subject</p><p className="font-medium text-ensena-ink">{latest.intake.subjects.join(", ") || "—"}</p></div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Target className="size-3.5" /></span>
              <div><p className="text-xs text-ensena-muted">Exam / Goal</p><p className="font-medium text-ensena-ink">{latest.intake.examGoal}</p></div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Flag className="size-3.5" /></span>
              <div><p className="text-xs text-ensena-muted">Your goal</p><p className="font-medium text-ensena-ink">{latest.intake.goalText || "Not specified."}</p></div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600"><MessageCircle className="size-3.5" /></span>
              <div><p className="text-xs text-ensena-muted">Anything else?</p><p className="font-medium text-ensena-ink">{latest.intake.message}</p></div>
            </li>
          </ul>
        </Card>

        {recommendation && (recommendedTutor || recommendedClass) ? (
          <Card title="Benny's Recommendation" action={<span className="rounded-full bg-ensena-primary/10 px-2 py-0.5 text-[10px] font-semibold text-ensena-primary">New</span>}>
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Lightbulb className="size-4" /></span>
              <p className="text-sm text-ensena-ink">{recommendation.message}</p>
            </div>

            {recommendedTutor && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Recommended Tutor</p>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-ensena-border p-3">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-full"><Image src={recommendedTutor.image} alt={recommendedTutor.name} fill sizes="44px" className="object-cover" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-semibold text-ensena-ink">{recommendedTutor.name} <CheckCircle2 className="size-3.5 shrink-0 text-ensena-primary" /></p>
                    <p className="truncate text-xs text-ensena-muted">{recommendedTutor.subjectTitle}</p>
                    <p className="flex items-center gap-1 text-xs text-ensena-ink">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      <LiveTutorRating name={recommendedTutor.name} rating={recommendedTutor.rating} reviews={recommendedTutor.reviews}>{(live) => <>{live.rating} ({live.reviews} reviews)</>}</LiveTutorRating>
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold text-ensena-ink">{formatNaira(recommendedTutor.price)}/hour</p>
                <Button nativeButton={false} render={<Link href={`/find-teachers/${recommendedTutor.slug}`} />} className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
                  View Tutor Profile
                </Button>
                <Link href={otherTutorsHref} className="mt-2 block text-center text-xs font-semibold text-ensena-primary hover:underline">See other tutor options →</Link>
              </>
            )}

            {recommendedClass && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Recommended Class</p>
                <div className="mt-2 rounded-xl border border-ensena-border p-3">
                  <p className="text-sm font-semibold text-ensena-ink">{recommendedClass.title}</p>
                  <p className="text-xs text-ensena-muted">{recommendedClass.levelBadge} · {formatNaira(recommendedClass.price)}/session</p>
                </div>
                <Button nativeButton={false} render={<Link href={`/group-classes/${recommendedClass.slug}`} />} className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
                  View Recommended Class
                </Button>
              </>
            )}
          </Card>
        ) : (
          <Card title="Benny's Recommendation">
            <p className="text-sm text-ensena-muted">Benny hasn&apos;t made a recommendation yet. This will appear here after your session.</p>
          </Card>
        )}

        {latestPlan ? (
          <Card title="Your Action Plan" icon={Target} action={<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{latestPlan.tasks.filter((t) => t.status === "Done").length} of {latestPlan.tasks.length} completed</span>}>
            <ol className="flex flex-col gap-3">
              {latestPlan.tasks.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  {t.status === "Done" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ensena-success" /> : <Circle className="mt-0.5 size-4 shrink-0 text-ensena-border" />}
                  <div>
                    <p className={cn("text-ensena-ink", t.status === "Done" && "text-ensena-muted line-through")}>{t.label}</p>
                    {t.status === "Done" && t.completedDate && <p className="text-xs text-ensena-muted">Completed on {t.completedDate}</p>}
                    {t.status !== "Done" && t.dueDate && <p className="text-xs text-ensena-muted">Due: {t.dueDate}</p>}
                  </div>
                </li>
              ))}
            </ol>
            {latestPlanOwner && (
              <Link href={`/student-dashboard/counselling/${latestPlanOwner.id}`} className="mt-4 flex h-10 w-full items-center justify-center rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                View Full Action Plan
              </Link>
            )}
          </Card>
        ) : (
          <Card title="Your Action Plan" icon={Target}>
            <p className="text-sm text-ensena-muted">No action plan yet. Benny will create one if it would help.</p>
          </Card>
        )}
      </div>

      {/* Row: Previous Sessions | Next Follow-up Session */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Previous Sessions">
          {pastSessions.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {pastSessions.map((a) => (
                <li key={a.id} className="flex flex-col gap-2.5 rounded-xl border border-ensena-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Video className="size-4" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ensena-ink">Counselling with {counsellor.name}</p>
                      <p className="truncate text-xs text-ensena-muted">{a.dateLabel} · {a.time}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", counsellingStatusStyles[a.status])}>{a.status}</span>
                    <Link href={`/student-dashboard/counselling/${a.id}`} className="shrink-0 text-xs font-semibold text-ensena-primary hover:underline">
                      {a.status === "Cancelled" ? "View Details →" : "View Summary →"}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ensena-muted">No previous sessions yet.</p>
          )}
        </Card>

        {nextFollowUp ? (
          <Card title="Next Follow-up Session" className="border-amber-200 bg-amber-50/60">
            <div className="flex items-start gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Calendar className="size-4" /></span>
              <div>
                <p className="text-sm font-semibold text-ensena-ink">Follow-up with {counsellor.name}</p>
                <p className="text-xs text-ensena-muted">{nextFollowUp.dateLabel} · {nextFollowUp.time} – {nextFollowUp.endTime}</p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">Scheduled</span>
              <button type="button" aria-label="More options" onClick={() => setManageApptId(nextFollowUp.id)} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-white">
                <MoreVertical className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={`/student-dashboard/counselling/${nextFollowUp.id}`} className="flex h-10 flex-1 items-center justify-center rounded-full border border-ensena-border bg-ensena-surface text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                View Details
              </Link>
              {(() => {
                const { enterable } = entryInfo(nextFollowUp, nowMs);
                return (
                  <Button
                    disabled={!enterable}
                    {...(enterable ? { nativeButton: false, render: <Link href={`/student-dashboard/classroom/counselling/${nextFollowUp.id}`} /> } : {})}
                    className="h-10 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
                  >
                    Enter Session
                  </Button>
                );
              })()}
            </div>
          </Card>
        ) : (
          <Card title="Next Follow-up Session">
            <p className="text-sm text-ensena-muted">No follow-up session scheduled.</p>
          </Card>
        )}
      </div>

      <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-ensena-border bg-ensena-bg-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
          <div>
            <p className="text-sm font-semibold text-ensena-ink">Need help before your session?</p>
            <p className="text-xs text-ensena-muted">You can message {counsellor.name} any time or reschedule if needed.</p>
          </div>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/student-dashboard/messages" />} className="h-10 shrink-0 rounded-full border-ensena-border bg-ensena-surface px-5 text-sm font-medium">
          <MessageCircle className="size-4" /> Message {counsellor.name}
        </Button>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}

      <ManageLessonSheet
        open={manageApptId !== null}
        data={(() => { const a = records.find((r) => r.id === manageApptId); return a ? buildApptManageData(a) : null; })()}
        actions={(() => { const a = records.find((r) => r.id === manageApptId); return a ? buildApptManageActions(a) : []; })()}
        onClose={() => setManageApptId(null)}
      />
      {(() => {
        const reportingAppt = records.find((r) => r.id === reportingApptId) ?? null;
        return (
          <ReportProblemModal
            open={reportingAppt !== null}
            onClose={() => setReportingApptId(null)}
            context="counselling"
            relatedRecordType="counselling"
            relatedRecordId={reportingAppt ? formatCounsellingDisplayId(reportingAppt.id) : ""}
            relatedRecordLabel={`Counselling session with ${counsellor.name}`}
          />
        );
      })()}
    </div>
  );
}
