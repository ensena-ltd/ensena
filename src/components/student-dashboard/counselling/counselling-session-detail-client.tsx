"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  Flag,
  Lightbulb,
  MessageSquare,
  MoreVertical,
  Star,
  Target,
  Video,
  XCircle,
} from "lucide-react";

import { NeedHelpCard } from "@/components/booking/need-help-card";
import { Button } from "@/components/ui/button";
import { LiveTutorRating } from "@/components/shared/live-tutor-rating";
import { ReportProblemModal } from "@/components/shared/report-problem-modal";
import { useAttendance } from "@/hooks/use-attendance";
import { useNowMs } from "@/hooks/use-now-ms";
import {
  counsellingStatusStyles,
  formatCounsellingDisplayId,
  getCounsellingTimeRange,
  initialCounsellingAppointments,
  type CounsellingAppointment,
} from "@/lib/admin-counselling-data";
import { canEnterClassroom, getClassEntryState, STUDENT_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { counsellor } from "@/lib/counsellor-data";
import { formatNaira } from "@/lib/format";
import { groupClassListings } from "@/lib/group-classes-data";
import { tutorListings } from "@/lib/tutors";
import { cn } from "@/lib/utils";

function Card({ title, icon: Icon, children }: { title: string; icon?: typeof Target; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold text-ensena-ink">
        {Icon && <Icon className="size-4 text-ensena-primary" />} {title}
      </h2>
      {children}
    </div>
  );
}

export function CounsellingSessionDetailClient({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const nowMs = useNowMs();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const appointment: CounsellingAppointment | undefined = initialCounsellingAppointments.find((a) => a.id === appointmentId);
  // Called unconditionally (Rules of Hooks) even though it's only meaningful
  // once `appointment` exists — `counselling:${appointmentId}` is still a
  // stable, harmless key to read even before that early return below.
  const attendanceRecords = useAttendance(`counselling:${appointmentId}`);

  if (!appointment) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">Unable to load this counselling session.</p>
        <Link href="/student-dashboard/counselling" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to My Counselling</Link>
      </div>
    );
  }

  const statusAllowsEntry = appointment.status === "New Booking" || appointment.status === "Upcoming" || appointment.status === "In Progress";
  const timeRange = getCounsellingTimeRange(appointment);
  const entryState = timeRange ? getClassEntryState({ ...timeRange, role: "student", nowMs }) : null;
  const canEnter = statusAllowsEntry && (entryState ? canEnterClassroom(entryState) : false);
  const entryHint =
    statusAllowsEntry && entryState === "too-early" && timeRange
      ? entryOpensHint(timeRange.startMs - STUDENT_ENTRY_WINDOW_MS, nowMs, "Session")
      : undefined;
  const isDone = appointment.status === "Completed" || appointment.status === "Follow-up";
  const studentAttended = attendanceRecords.some((r) => r.participantRole === "student");
  const counsellorAttended = attendanceRecords.some((r) => r.participantRole === "tutor");
  const attendanceNote =
    studentAttended && counsellorAttended
      ? undefined
      : !studentAttended && !counsellorAttended
        ? "Neither you nor your counsellor joined this session."
        : !studentAttended
          ? "You did not join this session."
          : `${counsellor.name} did not join this session.`;

  const recommendation = appointment.recommendation;
  const recommendedTutor = recommendation?.tutorSlug ? tutorListings.find((t) => t.slug === recommendation.tutorSlug) : undefined;
  const recommendedClass = recommendation?.groupClassSlug ? groupClassListings.find((c) => c.slug === recommendation.groupClassSlug) : undefined;

  const followUpAppointment = appointment.followUp?.appointmentId
    ? initialCounsellingAppointments.find((a) => a.id === appointment.followUp?.appointmentId)
    : undefined;

  return (
    <div>
      <Link href="/student-dashboard/counselling" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to My Counselling
      </Link>

      <div className="mt-3 flex flex-col gap-4">
        <Card title="Counselling Session" icon={Video}>
          <div className="mt-3 flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full"><Image src={counsellor.image} alt={counsellor.name} fill sizes="48px" className="object-cover" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ensena-ink">Counselling with {counsellor.name}</p>
              <p className="truncate text-xs text-ensena-muted">Enseña {counsellor.role} · Free Academic Counselling</p>
            </div>
            <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", counsellingStatusStyles[appointment.status])}>{appointment.status}</span>
            <div className="relative shrink-0">
              <button type="button" aria-label="More options" onClick={() => setMenuOpen((v) => !v)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                <MoreVertical className="size-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 z-20 w-52 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                  <button type="button" onClick={() => { setMenuOpen(false); router.push("/student-dashboard/messages"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                    <MessageSquare className="size-4" /> Message {counsellor.name}
                  </button>
                  <button type="button" onClick={() => { setMenuOpen(false); setReporting(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50">
                    <Flag className="size-4" /> Report a Problem
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-ensena-ink">{appointment.dateLabel} · {appointment.time} – {appointment.endTime}</p>
          <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><Clock className="size-3.5" /> {appointment.durationMinutes} minutes · Video Call</p>
          <p className="mt-2 font-mono text-xs text-ensena-muted">{formatCounsellingDisplayId(appointment.id)}</p>
          {canEnter && (
            <Button nativeButton={false} render={<Link href={`/student-dashboard/classroom/counselling/${appointment.id}`} />} className="mt-3 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover sm:w-auto sm:px-8">
              <Video className="size-4" /> {appointment.status === "In Progress" ? "Join Session" : "View Session"}
            </Button>
          )}
          {!canEnter && entryHint && <p className="mt-3 text-xs font-medium text-ensena-primary">{entryHint}</p>}
          {isDone && attendanceNote && <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs font-medium text-amber-800">{attendanceNote}</p>}
        </Card>

        {appointment.status === "Cancelled" ? (
          <Card title="Session Cancelled" icon={XCircle}>
            <p className="mt-2 text-sm text-ensena-muted">
              This counselling session was cancelled. You can book a new session with {counsellor.name} whenever you&apos;re ready.
            </p>
            <Link href="/counsellor" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">Speak to a Counsellor →</Link>
          </Card>
        ) : (
          <>
            <Card title="Your Concern">
              <p className="mt-2 rounded-xl bg-ensena-bg-soft p-3 text-sm text-ensena-ink">&ldquo;{appointment.intake.message}&rdquo;</p>
            </Card>

            {isDone && (
              <Card title="Session Summary">
                <p className="mt-2 text-sm text-ensena-ink">
                  {appointment.sessionSummary || "Your counsellor has not added a session summary yet."}
                </p>
              </Card>
            )}

            {isDone && (
              <Card title="Benny's Recommendations" icon={Lightbulb}>
                {recommendation && (recommendedTutor || recommendedClass || recommendation.type === "study-plan") ? (
                  <div className="mt-3 flex flex-col gap-3">
                    <p className="text-sm text-ensena-ink">{recommendation.message}</p>

                    {recommendedTutor && (
                      <div className="rounded-xl border border-ensena-border p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Recommended Tutor</p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-full"><Image src={recommendedTutor.image} alt={recommendedTutor.name} fill sizes="48px" className="object-cover" /></div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ensena-ink">{recommendedTutor.name}</p>
                            <p className="truncate text-xs text-ensena-muted">{recommendedTutor.subjectTitle}</p>
                            <p className="flex items-center gap-1 text-xs text-ensena-ink">
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              <LiveTutorRating name={recommendedTutor.name} rating={recommendedTutor.rating} reviews={recommendedTutor.reviews}>
                                {(live) => <>{live.rating} ({live.reviews} reviews)</>}
                              </LiveTutorRating>
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-ensena-ink">From {formatNaira(recommendedTutor.price)}/hour</p>
                        <Button nativeButton={false} render={<Link href={`/find-teachers/${recommendedTutor.slug}`} />} className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
                          View Tutor
                        </Button>
                      </div>
                    )}

                    {recommendedClass && (
                      <div className="rounded-xl border border-ensena-border p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Recommended Group Class</p>
                        <p className="mt-2 text-sm font-semibold text-ensena-ink">{recommendedClass.title}</p>
                        <p className="text-xs text-ensena-muted">{recommendedClass.subject} · {recommendedClass.levelBadge}</p>
                        <p className="mt-1 text-xs text-ensena-muted">{recommendedClass.days}, {recommendedClass.time}</p>
                        <p className="mt-1 text-sm font-semibold text-ensena-ink">{formatNaira(recommendedClass.price)}/session</p>
                        <p className="text-xs text-ensena-muted">{Math.max(0, recommendedClass.maxSeats - recommendedClass.enrolled)} of {recommendedClass.maxSeats} seats available</p>
                        <Button nativeButton={false} render={<Link href={`/group-classes/${recommendedClass.slug}`} />} className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
                          View Class
                        </Button>
                      </div>
                    )}

                    {!recommendedTutor && !recommendedClass && recommendation.type === "study-plan" && (
                      <p className="text-xs text-ensena-muted">This is a study-plan recommendation. See your action plan below for the specific steps.</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ensena-muted">No recommendations were added for this session.</p>
                )}
              </Card>
            )}
          </>
        )}

        {appointment.status !== "Cancelled" && (
          <Card title="Your Action Plan" icon={Target}>
            {appointment.actionPlan ? (
              <ol className="mt-3 flex flex-col gap-2">
                {appointment.actionPlan.tasks.map((t, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    {t.status === "Done" ? <CheckCircle2 className="size-4 shrink-0 text-ensena-success" /> : <Circle className="size-4 shrink-0 text-ensena-border" />}
                    <div>
                      <span className={cn("text-ensena-ink", t.status === "Done" && "text-ensena-muted line-through")}>{t.label}</span>
                      {t.status === "Done" && t.completedDate && <p className="text-xs text-ensena-muted">Completed on {t.completedDate}</p>}
                      {t.status !== "Done" && t.dueDate && <p className="text-xs text-ensena-muted">Due: {t.dueDate}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-ensena-muted">No action plan was created for this session.</p>
            )}
          </Card>
        )}

        {isDone && (
          <Card title="Follow-up" icon={Calendar}>
            {followUpAppointment ? (
              <div className="mt-2">
                <p className="text-sm font-semibold text-ensena-ink">Next Session</p>
                <p className="text-sm text-ensena-ink">{followUpAppointment.dateLabel} · {followUpAppointment.time}</p>
                <span className="mt-1 inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{followUpAppointment.status}</span>
                <Link href={`/student-dashboard/counselling/${followUpAppointment.id}`} className="mt-3 flex h-10 w-full items-center justify-center rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                  View Session
                </Link>
              </div>
            ) : appointment.followUp?.needed ? (
              <div className="mt-2">
                <p className="text-sm text-ensena-ink">Follow-up recommended</p>
                {appointment.followUp.date && <p className="text-xs text-ensena-muted">Recommended date: {appointment.followUp.date}</p>}
                <Button nativeButton={false} render={<Link href="/counsellor" />} className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
                  Book Follow-up
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ensena-muted">No follow-up required at this time.</p>
            )}
          </Card>
        )}

        {isDone && appointment.resources && appointment.resources.length > 0 && (
          <Card title="Recommended Resources">
            <ul className="mt-3 flex flex-col gap-3">
              {appointment.resources.map((r) => (
                <li key={r.title} className="rounded-xl border border-ensena-border p-3">
                  <p className="text-sm font-semibold text-ensena-ink">{r.title}</p>
                  <p className="mt-0.5 text-xs text-ensena-muted">{r.description}</p>
                  <Link href={r.url} className="mt-2 inline-flex text-xs font-semibold text-ensena-primary hover:underline">View Resource →</Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <NeedHelpCard role="Student" context="counselling" relatedRecordType="counselling" relatedRecordId={appointment.id} relatedRecordLabel={`Counselling with ${counsellor.name}`} />
      </div>

      <ReportProblemModal
        open={reporting}
        onClose={() => setReporting(false)}
        context="counselling"
        relatedRecordType="counselling"
        relatedRecordId={formatCounsellingDisplayId(appointment.id)}
        relatedRecordLabel={`Counselling session with ${counsellor.name}`}
      />
    </div>
  );
}
