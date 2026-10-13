"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  Circle,
  GraduationCap,
  Lightbulb,
  Lock,
  MessageCircle,
  FileText,
  MoreVertical,
  Plus,
  Star,
  Target,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  counsellingStatusStyles,
  initialCounsellingAppointments,
  studentSlug,
  type CounsellingActionPlanTask,
  type CounsellingAppointment,
} from "@/lib/admin-counselling-data";
import { formatNaira } from "@/lib/format";
import { groupClassListings } from "@/lib/group-classes-data";
import { tutorListings } from "@/lib/tutors";
import { useAdminSession } from "@/hooks/use-admin-session";
import { hasPermission } from "@/lib/admin-session";
import { cn } from "@/lib/utils";

type Tab = "Overview" | "Sessions" | "Intake" | "Action Plan";
const tabs: Tab[] = ["Overview", "Sessions", "Intake", "Action Plan"];

function Card({ title, icon: Icon, action, children }: { title: string; icon?: typeof Target; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
          {Icon && <span className="flex size-7 items-center justify-center rounded-lg bg-ensena-primary/10 text-ensena-primary"><Icon className="size-4" /></span>} {title}
        </h2>
        {action}
      </div>
      <div className="mt-3 flex-1">{children}</div>
    </div>
  );
}

export function CounsellingStudentProfileClient({ slug }: { slug: string }) {
  const router = useRouter();
  const session = useAdminSession();
  const canViewPrivateNotes = hasPermission(session, "Counselling", "View private counselling notes");
  const [appointments, setAppointments] = useState<CounsellingAppointment[]>(initialCounsellingAppointments);
  const [tab, setTab] = useState<Tab>("Overview");
  const [toast, setToast] = useState<string | null>(null);
  const [msgOpen, setMsgOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast((cur) => (cur === m ? null : cur)), 2500);
  }

  const records = appointments
    .filter((a) => studentSlug(a.student) === slug)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">No counselling history found for this student.</p>
        <Link href="/admin/counsellors?tab=Students" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Students</Link>
      </div>
    );
  }

  const latest = records[0];
  const first = [...records].sort((a, b) => a.dateISO.localeCompare(b.dateISO))[0];
  const hasActive = records.some((a) => a.status === "Upcoming" || a.status === "New Booking" || a.status === "In Progress" || (a.status === "Follow-up" && a.followUp?.needed));
  // The soonest upcoming session, not the furthest-dated one.
  const upcoming = [...records].filter((a) => a.status === "Upcoming" || a.status === "In Progress").sort((a, b) => a.dateISO.localeCompare(b.dateISO))[0];
  // "Last Session" means the most recent one that already happened — not
  // the next upcoming booking, even if that's more recently dated.
  const lastPastSession = records.find((a) => a.status === "Completed" || a.status === "Follow-up" || a.status === "Cancelled") ?? latest;
  const followUp = records.find((a) => a.followUp?.needed);
  const latestPlan = records.find((a) => a.actionPlan)?.actionPlan;
  const planOwnerId = records.find((a) => a.actionPlan)?.id;
  const about = records.find((a) => a.studentEmail);
  const primarySubject = latest.intake.subjects[0];
  // Prefer the real recommendation Benny actually made and saved; fall back
  // to a generic subject match only when she hasn't recommended anything yet.
  const actualRecommendation = records.find((a) => a.recommendation)?.recommendation;
  const recommendedTutor = actualRecommendation?.tutorSlug
    ? tutorListings.find((t) => t.slug === actualRecommendation.tutorSlug)
    : !actualRecommendation && primarySubject
      ? tutorListings.find((t) => t.subject === primarySubject)
      : undefined;
  const recommendedClass = actualRecommendation?.groupClassSlug
    ? groupClassListings.find((c) => c.slug === actualRecommendation.groupClassSlug)
    : !actualRecommendation && primarySubject
      ? groupClassListings.find((c) => c.subject === primarySubject)
      : undefined;

  function toggleTask(taskIndex: number) {
    if (!planOwnerId) return;
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id !== planOwnerId || !a.actionPlan) return a;
        const tasks = a.actionPlan.tasks.map((t, i) => (i === taskIndex ? { ...t, status: t.status === "Done" ? "Upcoming" : "Done" as CounsellingActionPlanTask["status"] } : t));
        return { ...a, actionPlan: { ...a.actionPlan, tasks } };
      })
    );
  }

  function addTask() {
    if (!planOwnerId) return;
    const label = window.prompt("New task");
    if (!label || !label.trim()) return;
    setAppointments((prev) =>
      prev.map((a) => (a.id === planOwnerId && a.actionPlan ? { ...a, actionPlan: { ...a.actionPlan, tasks: [...a.actionPlan.tasks, { label: label.trim(), status: "Upcoming" }] } } : a))
    );
  }

  function markPlanComplete() {
    if (!planOwnerId) return;
    setAppointments((prev) =>
      prev.map((a) => (a.id === planOwnerId && a.actionPlan ? { ...a, actionPlan: { ...a.actionPlan, tasks: a.actionPlan.tasks.map((t) => ({ ...t, status: "Done" })) } } : a))
    );
    flash("Action plan marked complete.");
  }

  function enterSession(appointmentId: string) {
    setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, status: "In Progress" } : a)));
    router.push(`/admin/counsellors/${appointmentId}/session`);
  }

  function saveNotes() {
    if (notesDraft === null) return;
    setAppointments((prev) => prev.map((a) => (a.id === latest.id ? { ...a, counsellorNotes: notesDraft } : a)));
    flash("Notes saved.");
  }

  const doneCount = latestPlan ? latestPlan.tasks.filter((t) => t.status === "Done").length : 0;

  return (
    <div>
      <Link href="/admin/counsellors?tab=Students" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to Students
      </Link>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Student Counselling Profile</p>
        <p className="mt-0.5 text-sm text-ensena-muted">View student details, sessions, intake and action plan.</p>
      </div>

      {/* Header */}
      <div className="mt-3 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full"><Image src={latest.studentImage} alt={latest.student} fill sizes="64px" className="object-cover" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl font-semibold text-ensena-ink">{latest.student}</h1>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", hasActive ? "bg-emerald-100 text-emerald-700" : "bg-ensena-bg-soft text-ensena-muted")}>
                  {hasActive ? "Active Counselling" : "Completed"}
                </span>
              </div>
              <p className="text-sm text-ensena-muted">{latest.level} · {latest.exam}</p>
              <p className="mt-0.5 text-xs text-ensena-muted">First counselling session: {first.dateLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => flash("Scheduling a counselling session from here isn't available in this demo yet.")} className="h-10 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white hover:bg-ensena-primary-hover">
              <CalendarPlus className="size-4" /> Schedule Session
            </Button>
            <Button variant="outline" onClick={() => setMsgOpen(true)} className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium text-ensena-ink">
              <MessageCircle className="size-4" /> Message Student
            </Button>
            <button type="button" onClick={() => flash("More actions aren't available in this demo.")} aria-label="More actions" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
              <MoreVertical className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-ensena-border pt-4 sm:grid-cols-4">
          <div><p className="text-xs text-ensena-muted">Current Concern</p><p className="mt-0.5 text-sm font-semibold text-ensena-ink">{latest.intake.concerns[0] ?? "General support"}</p></div>
          <div><p className="text-xs text-ensena-muted">Last Session</p><p className="mt-0.5 text-sm font-semibold text-ensena-ink">{lastPastSession.dateLabel}</p></div>
          <div><p className="text-xs text-ensena-muted">Next Session</p><p className="mt-0.5 text-sm font-semibold text-ensena-ink">{upcoming ? `${upcoming.dateLabel} · ${upcoming.time}` : "None scheduled"}</p></div>
          <div><p className="text-xs text-ensena-muted">Follow-up</p><p className="mt-0.5 text-sm font-semibold text-ensena-ink">{followUp?.followUp?.date ? `Due ${followUp.followUp.date}` : "None"}</p></div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 rounded-full px-4 py-1.5 font-medium transition-colors", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <Card title="Academic Information" icon={GraduationCap}>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><dt className="text-ensena-muted">Academic Level</dt><dd className="font-medium text-ensena-ink">{latest.intake.academicLevel}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Exam Goal</dt><dd className="font-medium text-ensena-ink">{latest.intake.examGoal}</dd></div>
                <div className="flex justify-between gap-2"><dt className="shrink-0 text-ensena-muted">Subjects</dt><dd className="text-right font-medium text-ensena-ink">{latest.intake.subjects.join(", ") || "—"}</dd></div>
              </dl>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Current Academic Goal</p>
              <p className="mt-1 text-sm text-ensena-ink">{latest.intake.goalText || "Not specified."}</p>
            </Card>

            <Card title="Current Concern" icon={Target}>
              <p className="text-sm text-ensena-ink">{latest.intake.message}</p>
              {latest.intake.supportPreferences.length > 0 && (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Preferred Support</p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-sm text-ensena-ink">
                    {latest.intake.supportPreferences.map((s) => (
                      <li key={s} className="flex items-center gap-1.5"><span className="size-1 shrink-0 rounded-full bg-ensena-primary" /> {s}</li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            <Card title="Next Counselling Session" icon={Video}>
              {upcoming ? (
                <>
                  <dl className="flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between"><dt className="text-ensena-muted">Counsellor</dt><dd className="font-medium text-ensena-ink">Benny</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Date</dt><dd className="font-medium text-ensena-ink">{upcoming.dateLabel}</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Time</dt><dd className="font-medium text-ensena-ink">{upcoming.time} – {upcoming.endTime}</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Type</dt><dd className="font-medium text-ensena-ink">Video Call</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Status</dt><dd><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", counsellingStatusStyles[upcoming.status])}>{upcoming.status}</span></dd></div>
                  </dl>
                  <Button onClick={() => enterSession(upcoming.id)} className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
                    <Video className="size-4" /> Enter Session
                  </Button>
                </>
              ) : (
                <p className="text-sm text-ensena-muted">No upcoming session scheduled.</p>
              )}
            </Card>

            <Card title="Recommended Ensena Support" icon={Lightbulb}>
              <div className="flex flex-col gap-3">
                {recommendedTutor && (
                  <div className="rounded-xl border border-ensena-border p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Users className="size-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ensena-ink">{recommendedTutor.subject} Tutor</p>
                        <p className="truncate text-xs text-ensena-muted">{latest.level} · {latest.exam}</p>
                      </div>
                    </div>
                    <Link href={`/find-teachers/${recommendedTutor.slug}`} className="mt-2.5 flex h-8 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View Tutor</Link>
                  </div>
                )}
                {recommendedClass && (
                  <div className="rounded-xl border border-ensena-border p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Star className="size-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ensena-ink">{recommendedClass.title}</p>
                        <p className="truncate text-xs text-ensena-muted">{recommendedClass.levelBadge} · {formatNaira(recommendedClass.price)}/session</p>
                      </div>
                    </div>
                    <Link href={`/group-classes/${recommendedClass.slug}`} className="mt-2.5 flex h-8 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View Class</Link>
                  </div>
                )}
                {!recommendedTutor && !recommendedClass && <p className="text-sm text-ensena-muted">No matching tutor or class found yet.</p>}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <Card title="Student Intake Summary" icon={Lightbulb}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">What do you need help with?</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {latest.intake.concerns.map((c) => <span key={c} className="rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">{c}</span>)}
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Student&apos;s message</p>
              <p className="mt-1 text-sm text-ensena-ink">&ldquo;{latest.intake.message}&rdquo;</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Goal</p>
              <p className="mt-1 text-sm text-ensena-ink">{latest.intake.goalText || latest.intake.examGoal}</p>
            </Card>

            <Card title="Intake Summary" icon={FileText}>
              <p className="text-sm text-ensena-ink">{latest.aiSummary.summary}</p>
              {latest.aiSummary.suggestedTopics.length > 0 && (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Recommended discussion points</p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-sm text-ensena-ink">
                    {latest.aiSummary.suggestedTopics.map((t) => (
                      <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 shrink-0 text-ensena-success" /> {t}</li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            <Card
              title="Action Plan"
              icon={Target}
              action={latestPlan && <span className="text-[11px] text-ensena-muted">Created {latestPlan.createdDate}</span>}
            >
              {latestPlan ? (
                <>
                  <ol className="flex flex-col gap-2">
                    {latestPlan.tasks.map((t, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <button type="button" onClick={() => toggleTask(i)} aria-label={t.status === "Done" ? "Mark not done" : "Mark done"}>
                          {t.status === "Done" ? <CheckCircle2 className="size-4 text-ensena-success" /> : <Circle className="size-4 text-ensena-border" />}
                        </button>
                        <span className={cn("text-ensena-ink", t.status === "Done" && "line-through decoration-ensena-border")}>{t.label}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-xs font-medium text-ensena-muted">{doneCount} / {latestPlan.tasks.length} completed</p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" onClick={addTask} className="h-8 flex-1 rounded-full border-ensena-border text-xs font-medium"><Plus className="size-3.5" /> Add Task</Button>
                    <Button onClick={markPlanComplete} className="h-8 flex-1 rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-ensena-primary-hover">Mark Complete</Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ensena-muted">No action plan created yet.</p>
              )}
            </Card>

            <Card title="Private Counsellor Notes" icon={Lock}>
              {canViewPrivateNotes ? (
                <>
                  <textarea
                    value={notesDraft ?? latest.counsellorNotes ?? ""}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={5}
                    placeholder="Write private notes about this student…"
                    className="w-full flex-1 resize-none rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-ensena-muted">🔒 Not visible to the student</p>
                    <Button onClick={saveNotes} className="h-8 shrink-0 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">Save Notes</Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ensena-muted">🔒 Your role doesn&apos;t have permission to view private counselling notes.</p>
              )}
            </Card>
          </div>

          {about && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-ensena-border bg-ensena-surface p-5 text-sm text-ensena-muted">
              <p className="font-semibold text-ensena-ink">About {latest.student.split(" ")[0]}</p>
              {about.studentMemberSince && <span>Member since: {about.studentMemberSince}</span>}
              {about.studentEmail && <span>Email: {about.studentEmail}</span>}
              {about.studentPhone && <span>Phone: {about.studentPhone}</span>}
              {about.studentLocation && <span>Location: {about.studentLocation}</span>}
            </div>
          )}
        </div>
      )}

      {tab === "Sessions" && (
        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Counselling History</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Reason</th>
                  <th className="py-2 pr-3 font-medium">Duration</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {records.map((a) => (
                  <tr key={a.id} className="border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft">
                    <td className="py-3 pr-3 text-ensena-ink">{a.dateLabel} · {a.time}</td>
                    <td className="py-3 pr-3 text-ensena-muted"><span className="inline-flex items-center gap-1"><Video className="size-3.5" /> Video Call</span></td>
                    <td className="py-3 pr-3 text-ensena-muted">{a.intake.concerns[0] ?? "General support"}</td>
                    <td className="py-3 pr-3 text-ensena-muted">{a.durationMinutes} min</td>
                    <td className="py-3 pr-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", counsellingStatusStyles[a.status])}>{a.status}</span></td>
                    <td className="py-3 pr-3 text-right">
                      {a.status === "Upcoming" || a.status === "In Progress" ? (
                        <button type="button" onClick={() => enterSession(a.id)} className="inline-flex h-8 items-center justify-center rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">
                          Enter
                        </button>
                      ) : (
                        <Link href={`/admin/counsellors/${a.id}`} className="inline-flex h-8 items-center justify-center rounded-full border border-ensena-border px-4 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Intake" && (
        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Counselling Intake</h2>
          <div className="mt-4 flex flex-col gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">What do you need help with?</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {latest.intake.concerns.map((c) => <span key={c} className="rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">{c}</span>)}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Student&apos;s message</p>
              <p className="mt-1.5 rounded-xl bg-ensena-bg-soft p-3 text-ensena-ink">&ldquo;{latest.intake.message}&rdquo;</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div><p className="text-xs text-ensena-muted">Academic Level</p><p className="font-medium text-ensena-ink">{latest.intake.academicLevel}</p></div>
              <div><p className="text-xs text-ensena-muted">Subject</p><p className="font-medium text-ensena-ink">{latest.intake.subjects.join(", ") || "—"}</p></div>
              <div><p className="text-xs text-ensena-muted">Exam</p><p className="font-medium text-ensena-ink">{latest.intake.examGoal}</p></div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Goal</p>
              <p className="mt-1.5 text-ensena-ink">{latest.intake.goalText || "Not specified."}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Preferred Support</p>
              <p className="mt-1.5 font-medium text-ensena-ink">{latest.intake.supportPreferences.join(", ") || "Not specified."}</p>
            </div>
          </div>
        </div>
      )}

      {tab === "Action Plan" && (
        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          {latestPlan ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ensena-ink">{latestPlan.title}</p>
                <span className="text-xs text-ensena-muted">Created {latestPlan.createdDate}</span>
              </div>
              <ol className="mt-3 flex flex-col gap-2.5">
                {latestPlan.tasks.map((t, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <button type="button" onClick={() => toggleTask(i)} aria-label={t.status === "Done" ? "Mark not done" : "Mark done"}>
                      {t.status === "Done" ? <CheckCircle2 className="size-4 shrink-0 text-ensena-success" /> : t.status === "In Progress" ? <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-100"><span className="size-1.5 rounded-full bg-amber-600" /></span> : <Circle className="size-4 shrink-0 text-ensena-border" />}
                    </button>
                    <span className={cn("text-ensena-ink", t.status === "Done" && "line-through decoration-ensena-border")}>{i + 1}. {t.label}</span>
                    <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold", t.status === "Done" ? "bg-emerald-100 text-emerald-700" : t.status === "In Progress" ? "bg-amber-100 text-amber-700" : "bg-ensena-bg-soft text-ensena-muted")}>{t.status}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs font-medium text-ensena-muted">{doneCount} / {latestPlan.tasks.length} completed</p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={addTask} className="h-9 flex-1 rounded-full border-ensena-border text-xs font-medium"><Plus className="size-3.5" /> Add Task</Button>
                <Button onClick={markPlanComplete} className="h-9 flex-1 rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-ensena-primary-hover">Mark Complete</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-ensena-muted">No action plan has been created for this student yet.</p>
          )}
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}

      <AdminMsgTutorModal open={msgOpen} onClose={() => setMsgOpen(false)} recipientName={latest.student} role="Student" />
    </div>
  );
}
