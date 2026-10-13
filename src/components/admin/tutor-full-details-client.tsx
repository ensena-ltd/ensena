"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  GraduationCap,
  Languages,
  Lightbulb,
  MapPin,
  ShieldCheck,
  Video,
} from "lucide-react";

import { AccountActionModal } from "@/components/admin/shared/account-action-modal";
import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import { ModerationRestrictionPanel } from "@/components/admin/moderation-restriction-panel";
import { FullDetailsPageLayout, type FullDetailsAction } from "@/components/admin/shared/full-details-page-layout";
import { ReviewCard } from "@/components/shared/reviews/review-card";
import { useAccountStatus, useEffectiveAccountStatus } from "@/hooks/use-account-status";
import { useFeaturedTutors } from "@/hooks/use-featured-placements";
import { useReviews } from "@/hooks/use-reviews";
import {
  adminTutorStatusStyles,
  banReasons,
  initialAdminTutors,
  suspendReasons,
} from "@/lib/admin-data";
import { setAccountStatus } from "@/lib/account-status-store";
import { currentActorLabel } from "@/lib/admin-session";
import { featureTutor, unfeatureTutor } from "@/lib/admin-promotions-store";
import { getSafetyProfile } from "@/lib/moderation-store";
import type { SafetyCategory } from "@/lib/communication-safety";
import { computeEffectiveTutorRating } from "@/lib/reviews-store";
import { tutorLessonStatusStyles, tutorProfiles } from "@/lib/admin-tutor-profile-data";
import { slugify } from "@/lib/tutors";
import { splitEarnings } from "@/lib/commission";
import { downloadCsv } from "@/lib/csv";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

type MoreSection = "Escrow" | "Withdrawals" | "Verification" | "Documents" | "Messages" | "Activity Logs";
const moreSections: MoreSection[] = ["Escrow", "Withdrawals", "Verification", "Documents", "Messages", "Activity Logs"];

const categoryLabelsForAdmin: Record<SafetyCategory, string> = {
  url: "an external link",
  email: "an email address",
  phone: "a phone number",
  social: "off-platform contact information",
  payment: "off-platform payment details",
  address: "a physical address or meeting location",
};

export function TutorFullDetailsClient({ tutorId }: { tutorId: string }) {
  const tutor = initialAdminTutors.find((t) => t.id === tutorId);
  const profile = tutorProfiles[tutorId];

  const rawAccountStatus = useAccountStatus("tutor", tutorId);
  const { status } = useEffectiveAccountStatus("tutor", tutorId);
  const allReviews = useReviews();
  const [lessonFilter, setLessonFilter] = useState("All");
  const [moreSection, setMoreSection] = useState<MoreSection>("Escrow");
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const featuredTutors = useFeaturedTutors();

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  if (!tutor || !profile) return null;

  // Same non-null-alias workaround booking-full-details-client.tsx already
  // uses — TS can't carry the guard above into a nested function
  // declaration's closure.
  const currentTutor = tutor;
  const currentProfile = profile;

  const tutorReviews = allReviews.filter((r) => r.direction === "student-to-tutor" && r.recipientName === tutor.name);
  const liveRating = computeEffectiveTutorRating(tutor.name, tutor.rating, tutor.reviews);
  const safetyProfile = getSafetyProfile(tutor.name, "Tutor");
  const featured = featuredTutors.some((t) => t.id === tutor.id);

  function toggleFeatured() {
    if (featured) {
      unfeatureTutor(currentTutor.id);
      flash(`${currentTutor.name} removed from featured tutors.`);
    } else {
      featureTutor({ id: currentTutor.id, name: currentTutor.name, subject: currentTutor.subjects[0] ?? "", rating: liveRating.rating, image: currentProfile.image });
      flash(`${currentTutor.name} featured on homepage.`);
    }
  }

  const actions: FullDetailsAction[] = [
    { key: "message", label: "Message", onClick: () => setMsgOpen(true) },
    ...(status !== "Active"
      ? [{ key: "reinstate", label: "Reinstate", onClick: () => { setAccountStatus("tutor", tutorId, "Active", undefined, currentActorLabel()); flash("Tutor reinstated."); }, variant: "success" as const }]
      : []),
    ...(status !== "Banned" ? [{ key: "take-action", label: "Take Action", onClick: () => setActionModalOpen(true), variant: "warning" as const }] : []),
    {
      key: "export",
      label: "Export Report",
      onClick: () =>
        downloadCsv(
          [
            ["Field", "Value"],
            ["Name", tutor.name],
            ["Email", tutor.email],
            ["Subjects", tutor.subjects.join(", ")],
            ["Rating", liveRating.rating],
            ["Lifetime Earnings", tutor.earnings],
          ],
          `${tutor.name.replace(/\s+/g, "-").toLowerCase()}-profile.csv`
        ),
    },
  ];

  return (
    <div>
      <FullDetailsPageLayout
        backHref="/admin/tutors"
        backLabel="Back to Tutors"
        image={profile.image}
        name={tutor.name}
        subtitle={`${tutor.id.toUpperCase()} · ${tutor.email}`}
        badges={
          <>
            {tutor.verification === "Verified" && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="size-3" /> Verified
              </span>
            )}
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", adminTutorStatusStyles[status])}>{status}</span>
          </>
        }
        actions={actions}
        tabs={[
          {
            key: "overview",
            label: "Overview",
            content: (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-ensena-border p-4">
                    <p className="text-sm font-semibold text-ensena-ink">About Tutor</p>
                    <p className="mt-1.5 text-sm text-ensena-muted">{profile.bio}</p>
                    <p className="mt-3 text-xs font-medium text-ensena-ink">Education</p>
                    <p className="text-sm text-ensena-muted">{profile.education}</p>
                    <p className="mt-3 text-xs font-medium text-ensena-ink">Teaching Experience</p>
                    <p className="text-sm text-ensena-muted">{profile.experienceYears} years</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ensena-muted">
                      <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {profile.state}, {profile.country}</span>
                      <span className="flex items-center gap-1"><GraduationCap className="size-3.5" /> {profile.experienceYears} yrs exp.</span>
                      <span className="flex items-center gap-1"><Languages className="size-3.5" /> {profile.languages.join(", ")}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-ensena-border p-4">
                    <p className="text-sm font-semibold text-ensena-ink">Subjects &amp; Levels</p>
                    <div className="mt-2 flex flex-col gap-2 text-sm">
                      {profile.subjectsByLevel.map((s) => (
                        <div key={s.subject}>
                          <p className="text-ensena-ink">{s.subject}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.levels.map((l) => <span key={l} className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-xs text-ensena-muted">{l}</span>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-ensena-border p-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-ensena-bg-soft text-ensena-muted"><Video className="size-5" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ensena-ink">Intro Video</p>
                      <p className="text-sm text-ensena-muted">02:14</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-ensena-border p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ensena-ink">Availability</p>
                      <span className="flex items-center gap-1 text-sm text-ensena-primary"><Calendar className="size-3.5" /> View Calendar</span>
                    </div>
                    <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                      <div className="flex justify-between"><dt className="text-ensena-muted">Next Available</dt><dd className="text-ensena-ink">{profile.nextAvailable}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Timezone</dt><dd className="text-ensena-ink">{profile.timezone}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Teaching Mode</dt><dd className="text-ensena-ink">{profile.teachingMode}</dd></div>
                    </dl>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="text-lg font-semibold text-ensena-ink">{liveRating.rating || "N/A"}</p><p className="text-xs text-ensena-muted">Rating</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="text-lg font-semibold text-ensena-ink">{profile.assignedStudents.length}</p><p className="text-xs text-ensena-muted">Students</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="text-lg font-semibold text-ensena-ink">{tutor.lessonsCompleted}</p><p className="text-xs text-ensena-muted">Lessons</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="text-lg font-semibold text-ensena-ink">{profile.responseTimeMinutes}m</p><p className="text-xs text-ensena-muted">Response</p></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="text-lg font-semibold text-ensena-success">{profile.completionRatePct}%</p><p className="text-xs text-ensena-muted">Completion Rate</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3 text-center"><p className="text-lg font-semibold text-rose-600">{profile.cancellationRatePct}%</p><p className="text-xs text-ensena-muted">Cancellation Rate</p></div>
                </div>

                <div className="rounded-2xl border border-ensena-border p-4">
                  <p className="text-sm font-semibold text-ensena-ink">Quick Actions</p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <button type="button" onClick={() => flash("Editing a tutor's profile fields isn't available in this demo yet.")} className="rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Edit Tutor</button>
                    <button type="button" onClick={toggleFeatured} className="rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-primary hover:bg-ensena-primary/10">{featured ? "Remove from Featured" : "Feature Tutor"}</button>
                    <button type="button" onClick={() => flash("Password reset isn't available in this demo. No real credential store exists.")} className="rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Reset Password</button>
                    <Link href={`/find-teachers/${slugify(tutor.name)}`} target="_blank" className="flex items-center justify-center rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-ink hover:bg-ensena-bg-soft">View Profile Public</Link>
                    <Link href="/admin/group-classes?tab=Pending Approval" className="flex items-center justify-center rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-success hover:bg-ensena-success/10">Review Pending Classes</Link>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "performance",
            label: "Performance",
            content: (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl bg-ensena-primary/5 p-4 text-center">
                  <p className="text-sm text-ensena-muted">Teaching Score</p>
                  <p className="text-3xl font-bold text-ensena-primary">{profile.aiTeachingScore}%</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {profile.aiBreakdown.map((b) => (
                    <div key={b.label} className="rounded-lg bg-ensena-bg-soft p-2.5">
                      <div className="flex justify-between text-sm"><span className="text-ensena-ink">{b.label}</span><span className="text-ensena-muted">{b.pct}%</span></div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-ensena-primary" style={{ width: `${b.pct}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-ensena-bg-soft p-3 text-center"><p className="font-semibold text-ensena-ink">{tutor.lessonsCompleted}</p><p className="text-xs text-ensena-muted">Lessons Completed</p></div>
                  <div className="rounded-lg bg-ensena-bg-soft p-3 text-center"><p className="font-semibold text-ensena-ink">{profile.attendancePct}%</p><p className="text-xs text-ensena-muted">Attendance</p></div>
                  <div className="rounded-lg bg-ensena-bg-soft p-3 text-center"><p className="font-semibold text-ensena-ink">{profile.lateStarts}</p><p className="text-xs text-ensena-muted">Late Starts</p></div>
                  <div className="rounded-lg bg-ensena-bg-soft p-3 text-center"><p className="font-semibold text-ensena-ink">{profile.cancelledLessons}</p><p className="text-xs text-ensena-muted">Cancelled</p></div>
                  <div className="rounded-lg bg-ensena-bg-soft p-3 text-center"><p className="font-semibold text-ensena-ink">{profile.homeworkCompletionPct}%</p><p className="text-xs text-ensena-muted">Homework</p></div>
                  <div className="rounded-lg bg-ensena-bg-soft p-3 text-center"><p className="font-semibold text-ensena-ink">{profile.retentionPct}%</p><p className="text-xs text-ensena-muted">Retention</p></div>
                </div>
                <div className="rounded-2xl border border-ensena-border p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink"><Lightbulb className="size-4 text-ensena-primary" /> Suggestions</p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {profile.aiSuggestions.map((s) => <li key={s} className="text-ensena-muted">• {s}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-ensena-border p-4">
                  <p className="text-sm font-semibold text-ensena-ink">Risk Analysis</p>
                  <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between"><dt className="text-ensena-muted">Burnout Risk</dt><dd className="text-ensena-ink">{profile.riskAnalysis.burnout}</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Cancellation Risk</dt><dd className="text-ensena-ink">{profile.riskAnalysis.cancellation}</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Rating Decline</dt><dd className="text-ensena-ink">{profile.riskAnalysis.ratingDecline}</dd></div>
                  </dl>
                </div>
              </div>
            ),
          },
          {
            key: "students",
            label: "Students",
            content: (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.assignedStudents.map((s) => (
                  <li key={s.name} className="rounded-2xl border border-ensena-border p-3.5 text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={s.image} alt={s.name} fill sizes="36px" className="object-cover" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ensena-ink">{s.name}</p>
                        <p className="text-xs text-ensena-muted">{s.level} · {s.subject}</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                      <span className="text-ensena-muted">Progress: <span className="text-ensena-ink">{s.progressPct}%</span></span>
                      <span className="text-ensena-muted">Attendance: <span className="text-ensena-ink">{s.attendancePct}%</span></span>
                      <span className="text-ensena-muted">Last: <span className="text-ensena-ink">{s.lastLesson}</span></span>
                      <span className="text-ensena-muted">Next: <span className="text-ensena-ink">{s.nextLesson}</span></span>
                    </div>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            key: "reviews",
            label: "Reviews",
            content: (
              <ul className="flex flex-col gap-3">
                {tutorReviews.map((r) => (
                  <li key={r.id}><ReviewCard review={r} /></li>
                ))}
                {tutorReviews.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No students have reviewed this tutor yet.</p>}
              </ul>
            ),
          },
          {
            key: "safety",
            label: "Safety",
            content: (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-ensena-muted">{safetyProfile.confirmedViolationCount} confirmed off-platform communication violation{safetyProfile.confirmedViolationCount === 1 ? "" : "s"} on record.</p>
                <ModerationRestrictionPanel actorName={tutor.name} actorRole="Tutor" actorEmail={tutor.email} />
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
            key: "lessons",
            label: "Lessons",
            content: (
              <div>
                <div className="flex flex-wrap gap-1.5 pb-3">
                  {["All", "Upcoming", "Completed", "Cancelled", "Missed", "Rescheduled"].map((f) => (
                    <button key={f} type="button" onClick={() => setLessonFilter(f)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", lessonFilter === f ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}>{f}</button>
                  ))}
                </div>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {profile.lessons.filter((l) => lessonFilter === "All" || l.status === lessonFilter).map((l) => (
                    <li key={l.id} className="rounded-xl bg-ensena-bg-soft p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-ensena-ink">{l.student}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", tutorLessonStatusStyles[l.status])}>{l.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-ensena-muted">{l.subject} · {l.date} · {l.duration}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          },
          {
            key: "earnings",
            label: "Earnings",
            content: (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Lifetime</p><p className="font-semibold text-ensena-ink">{formatNaira(profile.earnings.lifetime)}</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">This Month</p><p className="font-semibold text-ensena-ink">{formatNaira(profile.earnings.thisMonth)}</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Platform Fee (15%)</p><p className="font-semibold text-rose-600">{formatNaira(splitEarnings(profile.earnings.thisMonth).commission)}</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Net This Month</p><p className="font-semibold text-ensena-success">{formatNaira(splitEarnings(profile.earnings.thisMonth).net)}</p></div>
                </div>
                <div className="rounded-2xl border border-ensena-border p-4 text-sm">
                  <div className="flex justify-between"><span className="text-ensena-muted">Escrow Held</span><span className="font-medium text-ensena-ink">{formatNaira(profile.escrowHeld)}</span></div>
                  <div className="mt-1.5 flex justify-between"><span className="text-ensena-muted">Pending Withdrawal</span><span className="font-medium text-ensena-ink">{formatNaira(profile.pendingWithdrawal)}</span></div>
                </div>
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
                {moreSection === "Escrow" && (
                  <div className="rounded-2xl bg-ensena-bg-soft p-4 text-sm">
                    <p className="text-ensena-muted">{formatNaira(profile.escrowHeld)} currently held in escrow across active lessons. Full detail available in the Escrow &amp; Disputes page.</p>
                  </div>
                )}
                {moreSection === "Withdrawals" && (
                  <div className="rounded-2xl bg-ensena-bg-soft p-4 text-sm">
                    <p className="text-ensena-muted">Pending withdrawal: {formatNaira(profile.pendingWithdrawal)}. Manage approvals from the Withdrawals page.</p>
                  </div>
                )}
                {moreSection === "Verification" && (
                  <ul className="flex flex-col gap-2 text-sm">
                    {([
                      ["ID Document", profile.verificationDocuments.idDocument],
                      ["Qualifications", profile.verificationDocuments.qualifications],
                      ["Certificates", profile.verificationDocuments.certificates],
                      ["Teaching Video", profile.verificationDocuments.teachingVideo],
                    ] as const).map(([label, doc]) => (
                      <li key={label} className="flex items-center justify-between rounded-xl bg-ensena-bg-soft px-3 py-2">
                        <span className="text-ensena-ink">{label}</span>
                        {doc.submitted ? (
                          <span className="text-ensena-success">Submitted{doc.submittedAt ? ` · ${doc.submittedAt}` : ""}</span>
                        ) : (
                          <span className="text-amber-600">Not yet submitted</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {moreSection === "Documents" && (
                  <ul className="flex flex-col gap-2 text-sm">
                    {["Certificates.pdf", "CV.pdf", "Intro-video.mp4", "Government-ID.jpg"].map((doc) => (
                      <li key={doc} className="rounded-xl bg-ensena-bg-soft px-3 py-2 text-ensena-primary">{doc}</li>
                    ))}
                  </ul>
                )}
                {moreSection === "Messages" && (
                  <p className="rounded-2xl bg-ensena-bg-soft p-4 text-sm text-ensena-muted">Conversation history with students, admins, and support will appear here.</p>
                )}
                {moreSection === "Activity Logs" && (
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
        type="tutor"
        entityId={tutorId}
        entityName={tutor.name}
        reasonOptions={Array.from(new Set([...suspendReasons, ...banReasons]))}
        actor={currentActorLabel()}
        onClose={() => setActionModalOpen(false)}
        onDone={flash}
      />

      <AdminMsgTutorModal open={msgOpen} onClose={() => setMsgOpen(false)} recipientName={tutor.name} role="Tutor" />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
