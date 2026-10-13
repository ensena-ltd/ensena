"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Edit3,
  ExternalLink,
  FileClock,
  Fingerprint,
  History,
  Megaphone,
  ShieldCheck,
  Star,
  Users2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useGroupClassSubmissions } from "@/hooks/use-group-class-submissions";
import { useTutorRating } from "@/hooks/use-reviews";
import { initialAdminTutors } from "@/lib/admin-data";
import { marketplaceProfileFor } from "@/lib/admin-user-profile-data";
import { tutorProfiles } from "@/lib/admin-tutor-profile-data";
import {
  approvalCategoryFor,
  classChangeRequestFields,
  classRejectionReasons,
  examFor,
  initialGroupClasses,
  type GroupClassRow,
  type GroupClassStatus,
} from "@/lib/admin-group-classes-data";
import {
  addSubmissionNote,
  approveSubmission,
  rejectSubmission,
  requestSubmissionChanges,
  submissionToGroupClassRow,
} from "@/lib/group-class-submission-store";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

const tabs = ["Overview", "Description", "Schedule & Details", "Students", "History"] as const;
type Tab = (typeof tabs)[number];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <dt className="text-ensena-muted">{label}</dt>
      <dd className="text-right font-medium text-ensena-ink">{value}</dd>
    </div>
  );
}

function EnrollmentRing({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(1, enrolled / capacity) : 0;
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 110 110" className="size-28 -rotate-90">
      <circle cx="55" cy="55" r={r} fill="none" stroke="var(--ensena-bg-soft)" strokeWidth="10" />
      <circle
        cx="55" cy="55" r={r} fill="none" stroke="var(--ensena-primary)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
      />
      <text x="55" y="58" textAnchor="middle" transform="rotate(90 55 55)" className="fill-ensena-ink" style={{ font: "700 22px var(--font-heading, sans-serif)" }}>
        {enrolled}
      </text>
      <text x="55" y="74" textAnchor="middle" transform="rotate(90 55 55)" className="fill-ensena-muted" style={{ font: "500 10px sans-serif" }}>
        of {capacity}
      </text>
    </svg>
  );
}

export function AdminGroupClassReviewClient({ classId }: { classId: string }) {
  const [legacyClasses, setLegacyClasses] = useState<GroupClassRow[]>(initialGroupClasses);
  const submissions = useGroupClassSubmissions();
  const classes = useMemo(
    () => [...legacyClasses, ...submissions.map(submissionToGroupClassRow)],
    [legacyClasses, submissions]
  );
  const groupClass = classes.find((c) => c.id === classId);
  const isRealSubmission = submissions.some((s) => s.id === classId);
  const [tab, setTab] = useState<Tab>("Overview");

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState(classRejectionReasons[0]);
  const [rejectNote, setRejectNote] = useState("");
  const [changesOpen, setChangesOpen] = useState(false);
  const [changeFields, setChangeFields] = useState<string[]>([]);
  const [changeNote, setChangeNote] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const rating = useTutorRating(groupClass?.tutor ?? "", groupClass?.tutorRating ?? 0, groupClass?.reviewCount ?? 0);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  if (!groupClass) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This class could not be found.</p>
        <Link href="/admin/group-classes" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Group Classes</Link>
      </div>
    );
  }

  // TypeScript can't carry the `if (!groupClass)` narrowing above into these
  // function declarations (hoisting means they could in principle be called
  // before the check runs) — bind a definitely-typed alias once so the
  // closures below don't need repeated non-null assertions.
  const currentClass = groupClass;

  function updateClass(patch: Partial<GroupClassRow>) {
    setLegacyClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, ...patch } : c)));
  }
  function updateStatus(status: GroupClassStatus, patch: Partial<GroupClassRow> = {}) {
    updateClass({ status, ...patch });
  }

  function approve() {
    if (isRealSubmission) {
      const result = approveSubmission(classId);
      if (!result.ok) {
        flash(result.reason);
        setApproveOpen(false);
        return;
      }
    } else {
      updateStatus("Upcoming", {
        rejectionReason: undefined,
        changeRequestNote: undefined,
        changeRequestFields: undefined,
        activityLog: [...currentClass.activityLog, { time: "Just now", action: "Class approved and published" }],
      });
    }
    flash("Class approved and published.");
    setApproveOpen(false);
  }
  function reject() {
    if (isRealSubmission) {
      rejectSubmission(classId, rejectReason, rejectNote);
    } else {
      updateStatus("Rejected", {
        rejectionReason: rejectNote || rejectReason,
        activityLog: [...currentClass.activityLog, { time: "Just now", action: `Rejected: ${rejectReason}` }],
      });
    }
    flash("Class rejected.");
    setRejectOpen(false);
    setRejectNote("");
  }
  function sendChangeRequest() {
    if (isRealSubmission) {
      requestSubmissionChanges(classId, changeNote, changeFields);
    } else {
      updateStatus("Changes Requested", {
        changeRequestNote: changeNote,
        changeRequestFields: changeFields,
        activityLog: [...currentClass.activityLog, { time: "Just now", action: "Requested changes from tutor" }],
      });
    }
    flash("Requested changes sent to tutor.");
    setChangesOpen(false);
    setChangeFields([]);
    setChangeNote("");
  }
  function toggleField(f: string) {
    setChangeFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }
  function addNote() {
    if (!noteDraft.trim()) return;
    if (isRealSubmission) {
      addSubmissionNote(classId, noteDraft.trim());
    } else {
      updateClass({ adminNotes: [noteDraft.trim(), ...currentClass.adminNotes] });
    }
    setNoteDraft("");
  }

  const sourceTutor = initialAdminTutors.find((t) => t.id === groupClass.tutorId);
  const tutorVerified = sourceTutor?.verification === "Verified";
  const marketplace = marketplaceProfileFor(groupClass.tutor);
  const tutorProfile = sourceTutor ? tutorProfiles[sourceTutor.id] : undefined;
  const category = approvalCategoryFor(groupClass.status);
  const isDecided = category === "Approved" || category === "Rejected";
  const decisionEntries = groupClass.activityLog.filter((a) => /approved|rejected|requested changes/i.test(a.action));

  const checklist = [
    { label: "Tutor is verified", done: tutorVerified },
    { label: "Academic level is appropriate", done: groupClass.academicLevel.trim().length > 0 },
    { label: "Subject is valid", done: groupClass.subject.trim().length > 0 },
    { label: "Exam information is appropriate", done: true },
    { label: "Pricing is appropriate", done: groupClass.price > 0 },
    { label: "Schedule is complete", done: !!groupClass.scheduleDays && !!groupClass.scheduleTime },
  ];

  return (
    <div>
      <Link href="/admin/group-classes" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to Group Classes
      </Link>

      {/* Header */}
      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl">
              <Image src={groupClass.tutorImage} alt={groupClass.tutor} fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl font-semibold text-ensena-ink">{groupClass.title}</h1>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", category === "Approved" ? "bg-emerald-100 text-emerald-700" : category === "Rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
                  {groupClass.status === "Changes Requested" ? "Changes Requested" : category}
                </span>
              </div>
              <p className="mt-1 text-sm text-ensena-muted">{groupClass.description}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ensena-muted">
                <span className="flex items-center gap-1"><Clock className="size-3.5" /> Submitted {groupClass.submittedAt ?? groupClass.createdDate}</span>
                <span className="flex items-center gap-1"><Fingerprint className="size-3.5" /> Class ID: {groupClass.classCode}</span>
                <span className="flex items-center gap-1"><Users2 className="size-3.5" /> Created by {groupClass.tutor}</span>
                <span className="flex items-center gap-1"><History className="size-3.5" /> Last updated {groupClass.createdDate}</span>
              </div>
            </div>
          </div>

          {!isDecided ? (
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-56">
              <Button disabled={!tutorVerified} onClick={() => setApproveOpen(true)} className="h-10 w-full rounded-full bg-ensena-success text-sm font-semibold text-white hover:bg-ensena-success/90 disabled:opacity-50"><CheckCircle2 className="size-4" /> Approve Class</Button>
              <Button variant="outline" onClick={() => setChangesOpen(true)} className="h-10 w-full rounded-full border-amber-300 text-sm font-medium text-amber-700 hover:bg-amber-50"><Edit3 className="size-4" /> Request Changes</Button>
              <Button variant="outline" onClick={() => setRejectOpen(true)} className="h-10 w-full rounded-full border-rose-300 text-sm font-medium text-rose-600 hover:bg-rose-50"><XCircle className="size-4" /> Reject Class</Button>
            </div>
          ) : (
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-56">
              <div className={cn("flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold", category === "Approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                {category === "Approved" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                {category === "Approved" ? "Approved" : "Rejected"}
              </div>
              {category === "Approved" && (
                <Link href={`/admin/group-classes/${groupClass.id}/promote`} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
                  <Megaphone className="size-4" /> Promote Class
                </Link>
              )}
            </div>
          )}
        </div>

        {!tutorVerified && !isDecided && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            <AlertTriangle className="size-3.5 shrink-0" /> This tutor is not verified. Approval is disabled until tutor verification is complete.
          </p>
        )}
        {groupClass.changeRequestNote && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800"><span className="font-semibold">Admin note:</span> {groupClass.changeRequestNote}</p>
        )}
        {groupClass.rejectionReason && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"><span className="font-semibold">Rejection reason:</span> {groupClass.rejectionReason}</p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <div className="flex gap-6 overflow-x-auto border-b border-ensena-border text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "shrink-0 border-b-2 pb-2.5 pt-1 transition-colors",
                  tab === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink"
                )}
              >
                {t}{t === "Students" ? ` (${groupClass.studentsEnrolled})` : ""}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {tab === "Overview" && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                  <h2 className="font-heading text-sm font-semibold text-ensena-ink">Class Information</h2>
                  <dl className="mt-2 divide-y divide-ensena-border">
                    <InfoRow label="Subject" value={groupClass.subject} />
                    <InfoRow label="Class / Grade" value={groupClass.classGrade ?? "—"} />
                    <InfoRow label="Academic Level" value={groupClass.academicLevel} />
                    <InfoRow label="Exam" value={examFor(groupClass.academicLevel)} />
                    <InfoRow label="Class Type" value="Group Class" />
                    <InfoRow label="Mode" value={groupClass.mode} />
                    <InfoRow label="Price" value={`${formatNaira(groupClass.pricePerSession)}/session`} />
                    <InfoRow label="Maximum Students" value={String(groupClass.maxStudents)} />
                    <InfoRow label="Duration" value={`${groupClass.sessionDurationMins} minutes`} />
                    <InfoRow label="Language" value={groupClass.language} />
                    <InfoRow label="Start Date" value={groupClass.startDate} />
                  </dl>
                </div>

                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                  <h2 className="font-heading text-sm font-semibold text-ensena-ink">Tutor Information</h2>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-full"><Image src={groupClass.tutorImage} alt={groupClass.tutor} fill sizes="48px" className="object-cover" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ensena-ink">{groupClass.tutor}</p>
                      {tutorVerified ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><ShieldCheck className="size-3.5" /> Verified Tutor</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertTriangle className="size-3.5" /> Tutor Not Verified</span>
                      )}
                      <p className="text-xs text-ensena-muted">{groupClass.subject} Tutor</p>
                    </div>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-ensena-ink"><Star className="size-3.5 fill-amber-400 text-amber-400" /> {rating.rating || "N/A"} <span className="font-normal text-ensena-muted">({rating.reviews} reviews)</span></p>
                  <dl className="mt-3 divide-y divide-ensena-border">
                    <InfoRow label="Verification Status" value={sourceTutor?.verification ?? "Unknown"} />
                    <InfoRow label="Subjects" value={sourceTutor?.subjects.join(", ") ?? groupClass.subject} />
                    <InfoRow label="Exam Expertise" value={examFor(groupClass.academicLevel)} />
                    <InfoRow label="Experience" value={tutorProfile ? `${tutorProfile.experienceYears} years` : "—"} />
                    <InfoRow label="Teaching Level" value={marketplace?.levels.join(", ") ?? groupClass.academicLevel} />
                    <InfoRow label="Language" value={tutorProfile?.languages.join(", ") ?? groupClass.language} />
                  </dl>
                  <Link href={`/admin/users/usr-${groupClass.tutorId}`} className="mt-3 flex h-9 w-full items-center justify-center gap-1 rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                    View Tutor Profile <ExternalLink className="size-3" />
                  </Link>
                </div>

                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                  <h2 className="font-heading text-sm font-semibold text-ensena-ink">Enrollment Summary</h2>
                  <div className="mt-3 flex justify-center">
                    <EnrollmentRing enrolled={groupClass.studentsEnrolled} capacity={groupClass.maxStudents} />
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ensena-muted"><span className="size-2 rounded-full bg-ensena-primary" /> Enrolled</span><span className="font-medium text-ensena-ink">{groupClass.studentsEnrolled}</span></div>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ensena-muted"><span className="size-2 rounded-full bg-ensena-bg-soft" /> Available</span><span className="font-medium text-ensena-ink">{Math.max(0, groupClass.maxStudents - groupClass.studentsEnrolled)}</span></div>
                  </div>
                  <dl className="mt-3 divide-y divide-ensena-border">
                    <InfoRow label="Enrollment opens" value={groupClass.startDate} />
                    <InfoRow label="Class capacity" value={`${groupClass.maxStudents} students`} />
                  </dl>
                  {!isDecided && (
                    <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-blue-50 px-3 py-2.5 text-xs text-blue-700"><FileClock className="size-3.5 shrink-0" /> This class will be visible to students once approved.</p>
                  )}
                </div>
              </div>
            )}

            {tab === "Description" && (
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <h2 className="font-heading text-sm font-semibold text-ensena-ink">About This Class</h2>
                <p className="mt-2 text-sm text-ensena-muted">{groupClass.description}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ensena-muted">What Students Will Learn</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {groupClass.learningOutcomes.map((o) => (
                    <span key={o} className="flex items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-bg-soft px-3 py-1.5 text-xs font-medium text-ensena-ink">
                      <CheckCircle2 className="size-3.5 text-ensena-success" /> {o}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tab === "Schedule & Details" && (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                  <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink"><CalendarDays className="size-4 text-ensena-primary" /> Class Schedule</h2>
                  <dl className="mt-2 divide-y divide-ensena-border">
                    <InfoRow label="Days" value={groupClass.scheduleDays.split(",").join(", ")} />
                    <InfoRow label="Time" value={groupClass.scheduleTime} />
                    <InfoRow label="Mode" value={groupClass.mode} />
                    <InfoRow label="Starting" value={groupClass.startDate} />
                    <InfoRow label="Time Zone" value={groupClass.timezone} />
                    <InfoRow label="Cohort" value={`${groupClass.weeks} weeks · ${groupClass.sessionsTotal} sessions`} />
                  </dl>
                </div>
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                  <h2 className="font-heading text-sm font-semibold text-ensena-ink">Additional Details</h2>
                  <dl className="mt-2 divide-y divide-ensena-border">
                    <InfoRow label="Weekly Homework" value={groupClass.weeklyHomework ? "Yes" : "No"} />
                    <InfoRow label="Certificate on Completion" value={groupClass.certificateOnCompletion ? "Yes" : "No"} />
                    <InfoRow label="Homework Plan" value={groupClass.homeworkPlan} />
                  </dl>
                </div>
              </div>
            )}

            {tab === "Students" && (
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <h2 className="font-heading text-sm font-semibold text-ensena-ink">Students</h2>
                <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
                  {groupClass.students.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-2.5">
                      <span className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={s.image} alt={s.name} fill sizes="36px" className="object-cover" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ensena-ink">{s.name}</p>
                        <p className="text-xs text-ensena-muted">Attendance {s.attendancePct}% · Homework {s.homeworkPct}%</p>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", s.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-700" : s.paymentStatus === "Pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>{s.paymentStatus}</span>
                    </li>
                  ))}
                  {groupClass.students.length === 0 && <p className="py-6 text-center text-sm text-ensena-muted">No students enrolled yet.</p>}
                </ul>
              </div>
            )}

            {tab === "History" && (
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <h2 className="font-heading text-sm font-semibold text-ensena-ink">History</h2>
                <ul className="mt-3 flex flex-col gap-3">
                  {groupClass.activityLog.map((a, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ensena-primary" />
                      <div><p className="text-sm text-ensena-ink">{a.action}</p><p className="text-xs text-ensena-muted">{a.time}</p></div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Verification Checklist</h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2.5 text-sm">
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded border", item.done ? "border-ensena-success bg-ensena-success text-white" : "border-ensena-border")}>{item.done && <CheckCircle2 className="size-3.5" />}</span>
                  <span className={item.done ? "text-ensena-ink" : "text-ensena-muted"}>{item.label}</span>
                </li>
              ))}
              <li className="flex items-center gap-2.5 text-sm">
                <span className={cn("flex size-5 shrink-0 items-center justify-center rounded border", category === "Approved" ? "border-ensena-success bg-ensena-success text-white" : "border-ensena-border")}>{category === "Approved" && <CheckCircle2 className="size-3.5" />}</span>
                <span className={category === "Approved" ? "text-ensena-ink" : "text-ensena-muted"}>Class approved</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Admin Notes</h2>
            <p className="mt-1 text-xs text-ensena-muted">Add a note (optional)</p>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Write your notes here…"
              className="mt-2 w-full rounded-xl border border-ensena-border p-2.5 text-sm"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-ensena-muted">{noteDraft.length}/500</span>
              <button type="button" onClick={addNote} className="rounded-full bg-ensena-primary px-3 py-1 text-xs font-semibold text-white">Add</button>
            </div>
            {groupClass.adminNotes.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {groupClass.adminNotes.map((n, i) => <li key={i} className="rounded-lg bg-ensena-bg-soft px-2.5 py-1.5 text-xs text-ensena-ink">{n}</li>)}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink"><History className="size-4 text-ensena-primary" /> Decision History</h2>
            {decisionEntries.length === 0 ? (
              <p className="mt-2 text-sm text-ensena-muted">No actions taken yet.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {decisionEntries.map((a, i) => <li key={i} className="text-xs"><span className="text-ensena-ink">{a.action}</span><span className="text-ensena-muted"> · {a.time}</span></li>)}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-rose-700"><Megaphone className="size-4" /> Help Promote This Class</h2>
            <p className="mt-1.5 text-xs text-ensena-muted">After approval, promote this class to reach the right students and fill up available spots.</p>
            {category === "Approved" ? (
              <Link href={`/admin/group-classes/${groupClass.id}/promote`} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700">
                <Megaphone className="size-3.5" /> Promote Class
              </Link>
            ) : (
              <button type="button" disabled className="mt-3 flex h-9 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-full bg-rose-200 text-xs font-semibold text-white opacity-70">
                <Megaphone className="size-3.5" /> Available after approval
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Approve confirmation */}
      <Modal open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve Group Class?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This class will become visible to eligible students and can accept bookings.</p>
          <div className="mt-1 flex gap-2">
            <Button variant="outline" onClick={() => setApproveOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={approve} className="h-10 flex-1 rounded-full bg-ensena-success text-sm font-semibold text-white hover:bg-ensena-success/90">Approve Class</Button>
          </div>
        </div>
      </Modal>

      {/* Reject confirmation */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title={`Reject Group Class: ${groupClass.title}`}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason</span>
            <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
              {classRejectionReasons.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Admin note</span>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder="Explain why this class is being rejected…" className="rounded-xl border border-ensena-border p-2.5 text-sm" />
          </label>
          <div className="mt-1 flex gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={reject} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Reject Class</Button>
          </div>
        </div>
      </Modal>

      {/* Request Changes */}
      <Modal open={changesOpen} onClose={() => setChangesOpen(false)} title="Request Changes">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-ensena-muted">What needs to be changed?</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {classChangeRequestFields.map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm text-ensena-ink">
                  <input type="checkbox" checked={changeFields.includes(f)} onChange={() => toggleField(f)} className="size-4 rounded border-ensena-border accent-ensena-primary" />
                  {f}
                </label>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Message to tutor</span>
            <textarea value={changeNote} onChange={(e) => setChangeNote(e.target.value)} rows={3} placeholder="e.g. Please update the class schedule before we approve this class." className="rounded-xl border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button onClick={sendChangeRequest} className="mt-1 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">Send Request</Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
