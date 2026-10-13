"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, FileText, Globe2, Languages, Lightbulb, MapPin, Star, TrendingUp } from "lucide-react";

import { AccountActionModal } from "@/components/admin/shared/account-action-modal";
import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import { ModerationRestrictionPanel } from "@/components/admin/moderation-restriction-panel";
import { FullDetailsPageLayout, type FullDetailsAction } from "@/components/admin/shared/full-details-page-layout";
import { ReviewCard } from "@/components/shared/reviews/review-card";
import { useAccountStatus, useEffectiveAccountStatus } from "@/hooks/use-account-status";
import { useReviews } from "@/hooks/use-reviews";
import { useSavedTutorSlugs } from "@/hooks/use-saved-tutor";
import { setAccountStatus } from "@/lib/account-status-store";
import { adminStudentStatusStyles, initialAdminStudents } from "@/lib/admin-data";
import { currentActorLabel } from "@/lib/admin-session";
import type { SafetyCategory } from "@/lib/communication-safety";
import { getSafetyProfile } from "@/lib/moderation-store";
import {
  studentHomeworkStatusStyles,
  studentLessonStatusStyles,
  studentProfiles,
} from "@/lib/admin-student-profile-data";
import { downloadCsv } from "@/lib/csv";
import { formatNaira } from "@/lib/format";
import { getTutorBySlug } from "@/lib/tutors";
import { cn } from "@/lib/utils";

type MoreSection = "Counselling" | "Payments" | "Escrow" | "Messages" | "Activity Log";
const moreSections: MoreSection[] = ["Counselling", "Payments", "Escrow", "Messages", "Activity Log"];

const categoryLabelsForAdmin: Record<SafetyCategory, string> = {
  url: "an external link",
  email: "an email address",
  phone: "a phone number",
  social: "off-platform contact information",
  payment: "off-platform payment details",
  address: "a physical address or meeting location",
};

const riskStyles: Record<"Low" | "Medium" | "High", string> = {
  Low: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-rose-100 text-rose-700",
};

const studentActionReasons = [
  "Repeated policy violations",
  "Off-platform communication attempt",
  "Payment / booking irregularity",
  "Inappropriate conduct",
  "Other",
];

export function StudentFullDetailsClient({ studentId }: { studentId: string }) {
  const student = initialAdminStudents.find((s) => s.id === studentId);
  const profile = studentProfiles[studentId];

  const rawAccountStatus = useAccountStatus("student", studentId);
  const { status } = useEffectiveAccountStatus("student", studentId);
  const [lessonFilter, setLessonFilter] = useState("All");
  const [moreSection, setMoreSection] = useState<MoreSection>("Counselling");
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const allReviews = useReviews();
  const savedSlugs = useSavedTutorSlugs();

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  if (!student || !profile) return null;

  const studentReviews = allReviews.filter((r) => r.direction === "tutor-to-student" && r.recipientName === student.name);
  const safetyProfile = getSafetyProfile(student.name, "Student");
  // The real Saved-Tutors wishlist is single-persona demo state (there is
  // one signed-in student across the whole app, not per-admin-record
  // localStorage) — only meaningful when this admin record IS that real
  // persona; every other student row shows an honest "not available" note
  // instead of borrowing someone else's wishlist.
  const isRealPersona = student.name === "Cynthia Ejie";
  const savedTutors = isRealPersona ? savedSlugs.map((slug) => getTutorBySlug(slug)).filter((t): t is NonNullable<typeof t> => !!t) : [];

  const actions: FullDetailsAction[] = [
    { key: "message", label: "Message", onClick: () => setMsgOpen(true) },
    ...(status !== "Active"
      ? [{ key: "reinstate", label: "Reinstate", onClick: () => { setAccountStatus("student", studentId, "Active", undefined, currentActorLabel()); flash(`${student.name} reinstated.`); }, variant: "success" as const }]
      : []),
    ...(status !== "Banned" ? [{ key: "take-action", label: "Take Action", onClick: () => setActionModalOpen(true), variant: "warning" as const }] : []),
    {
      key: "export",
      label: "Export Report",
      onClick: () =>
        downloadCsv(
          [
            ["Field", "Value"],
            ["Name", student.name],
            ["Email", student.email],
            ["Level", student.level],
            ["Attendance", `${profile.attendancePct}%`],
            ["Learning Score", `${profile.aiLearningScore}%`],
          ],
          `${student.name.replace(/\s+/g, "-").toLowerCase()}-profile.csv`
        ),
    },
  ];

  return (
    <div>
      <FullDetailsPageLayout
        backHref="/admin/students"
        backLabel="Back to Students"
        image={profile.image}
        name={student.name}
        subtitle={`${student.id.toUpperCase()} · ${student.level}`}
        badges={
          <>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", adminStudentStatusStyles[status])}>{status}</span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", riskStyles[profile.riskLevel])}>{profile.riskLevel} Risk</span>
          </>
        }
        actions={actions}
        tabs={[
          {
            key: "overview",
            label: "Overview",
            content: (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ensena-muted">
                  <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {profile.state}, {profile.country}</span>
                  <span className="flex items-center gap-1"><Globe2 className="size-3.5" /> {profile.school}</span>
                  <span className="flex items-center gap-1"><Languages className="size-3.5" /> {profile.languages.join(", ")}</span>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-ensena-border p-4">
                    <p className="text-sm font-semibold text-ensena-ink">Learning Goals</p>
                    <ul className="mt-1.5 flex flex-col gap-0.5 text-sm text-ensena-muted">
                      {profile.learningGoals.map((g) => <li key={g}>• {g}</li>)}
                    </ul>
                    <p className="mt-3 text-xs font-medium text-ensena-ink">Preferred Learning Style</p>
                    <p className="text-sm text-ensena-muted">{profile.preferredLearningStyle}</p>
                    <p className="mt-3 text-xs font-medium text-ensena-ink">Current Subjects</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {profile.currentSubjects.map((s) => <span key={s} className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-xs text-ensena-ink">{s}</span>)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-ensena-border p-4">
                    <p className="text-sm font-semibold text-ensena-ink">Enrolment</p>
                    <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                      <div className="flex justify-between"><dt className="text-ensena-muted">Current Tutors</dt><dd className="text-ensena-ink">{profile.tutors.length}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Group Classes</dt><dd className="text-ensena-ink">{profile.groupClassesCount}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Counsellor Assigned</dt><dd className="text-ensena-ink">{profile.counsellorAssigned}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Last Login</dt><dd className="text-ensena-ink">{profile.lastLogin}</dd></div>
                    </dl>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="text-lg font-semibold text-ensena-ink">{profile.completedLessons}</p><p className="text-xs text-ensena-muted">Lessons</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="text-lg font-semibold text-ensena-ink">{profile.attendancePct}%</p><p className="text-xs text-ensena-muted">Attendance</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="text-lg font-semibold text-ensena-ink">{profile.averageScorePct}%</p><p className="text-xs text-ensena-muted">Avg Score</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="text-lg font-semibold text-ensena-ink">{profile.studyHours}h</p><p className="text-xs text-ensena-muted">Study Hours</p></div>
                </div>

                {profile.riskFlags.length > 0 && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-700"><AlertTriangle className="size-4" /> Flags</p>
                    <ul className="mt-1.5 flex flex-col gap-0.5 text-sm text-rose-700">
                      {profile.riskFlags.map((f) => <li key={f}>• {f}</li>)}
                    </ul>
                  </div>
                )}

                <div className="rounded-2xl border border-ensena-border p-4">
                  <p className="text-sm font-semibold text-ensena-ink">Quick Actions</p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <button type="button" onClick={() => flash("Editing a student's profile fields isn't available in this demo yet.")} className="rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Edit Student</button>
                    <button type="button" onClick={() => flash("Assigning a tutor isn't available in this demo yet. The student books directly from Find Teachers.")} className="rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Assign Tutor</button>
                    <button type="button" onClick={() => flash("Booking counselling on a student's behalf isn't available in this demo yet.")} className="rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-primary hover:bg-ensena-primary/10">Book Counselling</button>
                    <Link href={`/admin/bookings?query=${encodeURIComponent(student.name)}`} className="flex items-center justify-center rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Refund a Booking</Link>
                    <button type="button" onClick={() => flash("Password reset isn't available in this demo. No real credential store exists.")} className="rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Reset Password</button>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "learning",
            label: "Learning",
            content: (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="font-semibold text-ensena-ink">{profile.completedLessons}</p><p className="text-xs text-ensena-muted">Completed Lessons</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="font-semibold text-ensena-ink">{profile.upcomingLessons}</p><p className="text-xs text-ensena-muted">Upcoming Lessons</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="font-semibold text-ensena-ink">{profile.homeworkCompletionPct}%</p><p className="text-xs text-ensena-muted">Homework</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="font-semibold text-ensena-ink">{profile.studyHours}h</p><p className="text-xs text-ensena-muted">Study Hours</p></div>
                </div>

                <div className="rounded-2xl bg-ensena-primary/5 p-4 text-center">
                  <p className="flex items-center justify-center gap-1 text-sm text-ensena-muted"><TrendingUp className="size-3.5 text-ensena-primary" /> Learning Score</p>
                  <p className="text-3xl font-bold text-ensena-primary">{profile.aiLearningScore}%</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {profile.aiBreakdown.map((b) => (
                    <div key={b.label} className="rounded-lg bg-ensena-bg-soft p-2.5">
                      <div className="flex justify-between text-sm"><span className="text-ensena-ink">{b.label}</span><span className="text-ensena-muted">{b.pct}%</span></div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-ensena-primary" style={{ width: `${b.pct}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-ensena-border p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink"><FileText className="size-4 text-ensena-primary" /> Summary</p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {profile.aiSummary.map((s) => <li key={s} className="text-ensena-muted">• {s}</li>)}
                  </ul>
                </div>
              </div>
            ),
          },
          {
            key: "tutors",
            label: "Tutors",
            content: (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.tutors.map((t) => (
                  <li key={t.name} className="rounded-2xl border border-ensena-border p-3.5 text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={t.image} alt={t.name} fill sizes="36px" className="object-cover" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ensena-ink">{t.name}</p>
                        <p className="text-xs text-ensena-muted">{t.subject} · <Star className="inline size-2.5 fill-amber-400 text-amber-400" /> {t.rating}</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                      <span className="text-ensena-muted">Lessons: <span className="text-ensena-ink">{t.lessonsCompleted}</span></span>
                      <span className="text-ensena-muted">Next: <span className="text-ensena-ink">{t.nextLesson}</span></span>
                      <span className="text-ensena-muted">Attendance: <span className="text-ensena-ink">{t.attendanceTogetherPct}%</span></span>
                      <span className="text-ensena-muted">Avg Score: <span className="text-ensena-ink">{t.averageScorePct}%</span></span>
                    </div>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            key: "lessons",
            label: "Lessons",
            content: (
              <div>
                <div className="flex flex-wrap gap-1.5 pb-3">
                  {["All", "Upcoming", "Completed", "Cancelled", "Missed"].map((f) => (
                    <button key={f} type="button" onClick={() => setLessonFilter(f)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", lessonFilter === f ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}>{f}</button>
                  ))}
                </div>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {profile.lessons.filter((l) => lessonFilter === "All" || l.status === lessonFilter).map((l) => (
                    <li key={l.id} className="rounded-xl bg-ensena-bg-soft p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-ensena-ink">{l.tutor}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", studentLessonStatusStyles[l.status])}>{l.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-ensena-muted">{l.subject} · {l.type} · {l.date}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          },
          {
            key: "homework",
            label: "Homework",
            content: (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {profile.homework.map((h) => (
                  <li key={h.id} className="rounded-xl bg-ensena-bg-soft p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-ensena-ink">{h.assignment}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", studentHomeworkStatusStyles[h.status])}>{h.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-ensena-muted">{h.subject} · {h.tutor} · Due {h.due}{h.score ? ` · Score ${h.score}%` : ""}</p>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            key: "attendance",
            label: "Attendance",
            content: (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-ensena-border p-4">
                  <p className="text-sm font-semibold text-ensena-ink">Weekly Attendance</p>
                  <svg viewBox="0 0 560 90" className="mt-3 h-20 w-full" preserveAspectRatio="none">
                    <polyline
                      points={profile.attendanceTrend.map((v, i) => `${(i / (profile.attendanceTrend.length - 1)) * 560},${90 - (v / 100) * 82}`).join(" ")}
                      fill="none"
                      stroke="#6C63FF"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="rounded-2xl bg-ensena-primary/5 p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink"><Lightbulb className="size-4 text-ensena-primary" /> Insight</p>
                  <p className="mt-1.5 text-sm text-ensena-muted">{profile.attendanceInsight}</p>
                </div>
              </div>
            ),
          },
          {
            key: "reviews",
            label: "Reviews",
            content: (
              <ul className="flex flex-col gap-3">
                {studentReviews.map((r) => (
                  <li key={r.id}><ReviewCard review={r} /></li>
                ))}
                {studentReviews.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No tutors have reviewed this student yet.</p>}
              </ul>
            ),
          },
          {
            key: "wishlist",
            label: "Wishlist",
            content: isRealPersona ? (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {savedTutors.map((t) => (
                  <li key={t.slug} className="flex items-center gap-2.5 rounded-2xl border border-ensena-border p-3.5 text-sm">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full"><Image src={t.image} alt={t.name} fill sizes="40px" className="object-cover" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ensena-ink">{t.name}</p>
                      <p className="text-xs text-ensena-muted">{t.subjectTitle} · <Star className="inline size-2.5 fill-amber-400 text-amber-400" /> {t.rating}</p>
                    </div>
                  </li>
                ))}
                {savedTutors.length === 0 && <p className="col-span-full py-10 text-center text-sm text-ensena-muted">This student hasn&apos;t saved any tutors yet.</p>}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-ensena-muted">Wishlist data is only available for the currently signed-in student persona in this demo.</p>
            ),
          },
          {
            key: "safety",
            label: "Safety",
            content: (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-ensena-muted">{safetyProfile.confirmedViolationCount} confirmed off-platform communication violation{safetyProfile.confirmedViolationCount === 1 ? "" : "s"} on record.</p>
                <ModerationRestrictionPanel actorName={student.name} actorRole="Student" actorEmail={student.email} />
                {rawAccountStatus.status !== "Active" && (
                  <div className="rounded-2xl border border-ensena-border p-4 text-sm">
                    <p className="font-semibold text-ensena-ink">
                      Account status: {rawAccountStatus.status}
                      {rawAccountStatus.interim && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">Automatic: pending admin review</span>}
                    </p>
                    {rawAccountStatus.reason && <p className="mt-1 text-ensena-muted">Reason: {rawAccountStatus.reason}</p>}
                    {rawAccountStatus.expiresAt && (
                      <p className="mt-1 text-ensena-muted">
                        {status === "Active" ? "Expired" : "Expires"}: {new Date(rawAccountStatus.expiresAt).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ensena-muted">Set by {rawAccountStatus.updatedBy} · {rawAccountStatus.updatedAtLabel}</p>
                    {rawAccountStatus.caseReportId && (
                      <Link href={`/admin/reports/${rawAccountStatus.caseReportId}`} className="mt-1.5 inline-block text-xs font-semibold text-ensena-primary hover:underline">View related case</Link>
                    )}
                  </div>
                )}
                <ul className="flex flex-col gap-2">
                  {safetyProfile.violations.map((v) => (
                    <li key={v.id} className="flex items-start justify-between gap-3 rounded-xl border border-ensena-border p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ensena-ink">Attempted to share {categoryLabelsForAdmin[v.category]} via {v.channel.toLowerCase()}{v.fromContextWindow ? " (across several messages)" : ""}</p>
                        <p className="text-xs text-ensena-muted">{v.atLabel} · {v.confirmed ? "Confirmed" : "Pending review"}</p>
                        {v.evidenceSnippet && (
                          <p className="mt-1.5 rounded-lg bg-ensena-bg-soft p-2 font-mono text-xs text-ensena-muted" title="Admin-only evidence: never shown to the sender or recipient">
                            &ldquo;{v.evidenceSnippet}&rdquo;
                          </p>
                        )}
                      </div>
                      <Link href={`/admin/reports/${v.reportId}`} className="shrink-0 text-xs font-semibold text-ensena-primary hover:underline">View case</Link>
                    </li>
                  ))}
                  {safetyProfile.violations.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No off-platform communication violations on record.</p>}
                </ul>
              </div>
            ),
          },
          {
            key: "more",
            label: "More",
            content: (
              <div>
                <div className="flex flex-wrap gap-1.5 pb-3">
                  {moreSections.map((m) => (
                    <button key={m} type="button" onClick={() => setMoreSection(m)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", moreSection === m ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}>{m}</button>
                  ))}
                </div>
                {moreSection === "Counselling" && (
                  <div className="flex flex-col gap-2 text-sm">
                    {profile.counsellingUpcoming.length > 0 && (
                      <div className="rounded-xl bg-ensena-bg-soft p-3">
                        <p className="font-medium text-ensena-ink">Upcoming</p>
                        {profile.counsellingUpcoming.map((c) => <p key={c.date} className="text-ensena-muted">{c.topic}: {c.date}</p>)}
                      </div>
                    )}
                    {profile.counsellingCompleted.map((c) => (
                      <div key={c.date} className="rounded-xl bg-ensena-bg-soft p-3">
                        <p className="font-medium text-ensena-ink">{c.topic}</p>
                        <p className="text-ensena-muted">{c.date}</p>
                        <p className="mt-1 text-ensena-muted">{c.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
                {moreSection === "Payments" && (
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Total Paid</p><p className="font-semibold text-ensena-ink">{formatNaira(profile.payments.totalPaid)}</p></div>
                    <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Private Lessons</p><p className="font-semibold text-ensena-ink">{formatNaira(profile.payments.privateLessons)}</p></div>
                    <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Group Classes</p><p className="font-semibold text-ensena-ink">{formatNaira(profile.payments.groupClasses)}</p></div>
                    <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Counselling</p><p className="font-semibold text-ensena-ink">{formatNaira(profile.payments.counselling)}</p></div>
                  </div>
                )}
                {moreSection === "Escrow" && (
                  <div className="flex flex-col gap-2 text-sm">
                    {profile.escrow.length === 0 && <p className="text-ensena-muted">No payments currently held in escrow.</p>}
                    {profile.escrow.map((e) => (
                      <div key={e.lesson} className="rounded-xl bg-ensena-bg-soft p-3">
                        <div className="flex justify-between"><span className="font-medium text-ensena-ink">{e.lesson}</span><span className="text-amber-600">{e.status}</span></div>
                        <p className="text-ensena-muted">{e.tutor} · {formatNaira(e.amount)} · Releases {e.releaseDate}</p>
                      </div>
                    ))}
                  </div>
                )}
                {moreSection === "Messages" && <p className="rounded-2xl bg-ensena-bg-soft p-4 text-sm text-ensena-muted">Conversation history with tutors, counsellors, and support will appear here.</p>}
                {moreSection === "Activity Log" && (
                  <ul className="flex flex-col gap-2 text-sm">
                    {profile.activityLog.map((a, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl bg-ensena-bg-soft px-3 py-2"><span className="text-ensena-ink">{a.action}</span><span className="text-ensena-muted">{a.time}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
        ]}
      />

      <AccountActionModal
        open={actionModalOpen}
        type="student"
        entityId={studentId}
        entityName={student.name}
        reasonOptions={studentActionReasons}
        actor={currentActorLabel()}
        onClose={() => setActionModalOpen(false)}
        onDone={flash}
      />

      <AdminMsgTutorModal open={msgOpen} onClose={() => setMsgOpen(false)} recipientName={student.name} role="Student" />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
