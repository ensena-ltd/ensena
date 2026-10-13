"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronRight, CreditCard, Heart, Pencil, Plus, Receipt, Save, Settings, Shield, Target, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportReviewModal } from "@/components/shared/reviews/report-review-modal";
import { ReviewCard } from "@/components/shared/reviews/review-card";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { saveStudentIdentity, useStudentIdentity } from "@/components/student-dashboard/student-identity";
import { useReviews } from "@/hooks/use-reviews";
import { supportTypeOptions, type SupportTypeId } from "@/lib/academic-support-types";
import { reportReview } from "@/lib/reviews-store";
import { DEFAULT_STUDENT_IMAGE, dashboardStudent, studentProfileDetail } from "@/lib/student-dashboard-data";
import { subjectOptions } from "@/lib/tutor-dashboard-data";
import { isFoundingStudent } from "@/lib/tutor-recognition";
import { cn } from "@/lib/utils";

const academicLevelOptions = ["JSS1", "JSS2", "JSS3", "SSS1", "SSS2", "SSS3", "100 Level", "200 Level", "300 Level", "400 Level"];
const examGoalOptions = ["WAEC", "NECO", "JAMB / UTME", "IGCSE", "Not Applicable"];

function ProfileLinkRow({ icon: Icon, label, description, href }: { icon: typeof CreditCard; label: string; description: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-ensena-border p-3.5 hover:bg-ensena-bg-soft">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Icon className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ensena-ink">{label}</p>
        <p className="text-xs text-ensena-muted">{description}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-ensena-muted" />
    </Link>
  );
}

// Click the label to reveal a select + confirm/cancel, then collapse back to
// the same plain text it started as — same visual line the page already
// had, just made editable in place instead of adding a new section.
function InlineEditField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setDraft(value); setEditing(true); }}
        className="group flex items-center gap-1.5 text-xs text-ensena-muted hover:text-ensena-ink"
      >
        {label}: <span className="font-medium text-ensena-ink">{value}</span>
        <Pencil className="size-3 text-ensena-muted group-hover:text-ensena-primary" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-ensena-muted">{label}:</span>
      <select
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        className="h-7 rounded-lg border border-ensena-border px-1.5 text-xs"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <button
        type="button"
        aria-label={`Confirm ${label}`}
        onClick={() => { onChange(draft); setEditing(false); }}
        className="flex size-5 items-center justify-center rounded-full bg-ensena-success text-white"
      >
        <Check className="size-3" />
      </button>
      <button
        type="button"
        aria-label={`Cancel ${label} edit`}
        onClick={() => setEditing(false)}
        className="flex size-5 items-center justify-center rounded-full border border-ensena-border text-ensena-muted"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

export function StudentProfileClient() {
  const router = useRouter();
  const me = useStudentIdentity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(me.image);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [academicLevel, setAcademicLevel] = useState(me.level);
  const [examGoal, setExamGoal] = useState(studentProfileDetail.academicLevel);
  const [bio, setBio] = useState(studentProfileDetail.bio);
  const [subjects, setSubjects] = useState<string[]>(me.id ? me.subjects : studentProfileDetail.subjects);
  const [supportPreferences, setSupportPreferences] = useState<SupportTypeId[]>(studentProfileDetail.supportPreferences);
  const [goals, setGoals] = useState<string[]>(me.id ? me.goal.split("\n").filter(Boolean) : studentProfileDetail.learningGoals);
  const [newGoal, setNewGoal] = useState("");
  const [parentName, setParentName] = useState(me.guardian?.fullName ?? studentProfileDetail.parentName);
  const [parentContact, setParentContact] = useState(me.guardian?.phone ?? studentProfileDetail.parentContact);
  const [emergencyContact, setEmergencyContact] = useState(studentProfileDetail.emergencyContact);
  const [timezone, setTimezone] = useState(studentProfileDetail.timezone);
  const [saved, setSaved] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const allReviews = useReviews();
  const reviewsAboutMe = allReviews.filter((r) => r.direction === "tutor-to-student" && r.recipientName === me.name);

  function toggleSubject(subject: string) {
    setSubjects((prev) => (prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]));
  }

  function toggleSupportPreference(id: SupportTypeId) {
    setSupportPreferences((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function addGoal() {
    if (!newGoal.trim()) return;
    setGoals((prev) => [...prev, newGoal]);
    setNewGoal("");
  }

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoMenuOpen(false);
    e.target.value = "";
  }

  function removePhoto() {
    setPhotoUrl(DEFAULT_STUDENT_IMAGE);
    setPhotoMenuOpen(false);
  }

  // No real backend — "saving" writes straight back onto the existing
  // dashboardStudent / studentProfileDetail objects so every other page
  // that reads them (sidebar, Group Classes recommendations, etc.) picks
  // up the change on its next render, without a second parallel profile
  // store.
  async function handleSave() {
    const { ok } = await saveStudentIdentity(me.id, {
      student: { academic_detail: academicLevel || null, subjects, goal: goals.join("\n") || null },
      ...(me.guardian ? { guardian: { full_name: parentName.trim() || me.guardian.fullName, phone: parentContact.trim() || me.guardian.phone } } : {}),
    });
    if (!ok) return;
    if (me.id) router.refresh();
    dashboardStudent.image = photoUrl;
    dashboardStudent.level = academicLevel;
    studentProfileDetail.academicLevel = examGoal;
    studentProfileDetail.bio = bio;
    studentProfileDetail.subjects = subjects;
    studentProfileDetail.supportPreferences = supportPreferences;
    studentProfileDetail.learningGoals = goals;
    studentProfileDetail.parentName = parentName;
    studentProfileDetail.parentContact = parentContact;
    studentProfileDetail.emergencyContact = emergencyContact;
    studentProfileDetail.timezone = timezone;
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Profile</h1>
          <p className="mt-1 text-sm text-ensena-muted">Manage your personal and academic information.</p>
        </div>
        <Button onClick={handleSave} className="h-10 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-5 text-sm font-semibold text-white">
          <Save className="size-4" /> {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0">
              <div className="relative size-20 overflow-hidden rounded-full">
                <Image src={photoUrl} alt={me.name} fill sizes="80px" unoptimized={photoUrl.startsWith("blob:")} className="object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1">
                <button
                  type="button"
                  aria-label="Change profile picture"
                  onClick={() => setPhotoMenuOpen((v) => !v)}
                  className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-ensena-primary text-white shadow-sm"
                >
                  <Camera className="size-3.5" />
                </button>
                {photoMenuOpen && (
                  <div className="absolute left-0 top-9 z-20 w-40 rounded-xl border border-ensena-border bg-ensena-surface p-1.5 shadow-lg">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="block w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                    >
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="block w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      Remove Photo
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelected} className="hidden" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-semibold text-ensena-ink">{me.name}</p>
                {isFoundingStudent(me.name) && <FoundingBadge kind="Student" compact />}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <InlineEditField label="Level" value={academicLevel} options={academicLevelOptions.includes(academicLevel) || !academicLevel ? academicLevelOptions : [academicLevel, ...academicLevelOptions]} onChange={setAcademicLevel} />
                {me.course && <span className="text-xs text-ensena-muted">· {me.course}</span>}
                <span className="text-xs text-ensena-muted">· {me.tier}</span>
              </div>
              <div className="mt-0.5">
                <InlineEditField label="Exam Goal" value={examGoal} options={examGoalOptions} onChange={setExamGoal} />
              </div>
            </div>
          </div>
          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Bio</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="rounded-xl border border-ensena-border p-3 text-sm" />
          </label>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Subjects</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...subjectOptions, ...subjects.filter((x) => !subjectOptions.includes(x))].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSubject(s)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  subjects.includes(s) ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">What do you usually need help with?</h2>
          <p className="mt-1 text-xs text-ensena-muted">Optional. Helps us personalize which tutors we show you. You can change this anytime.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {supportTypeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleSupportPreference(option.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  supportPreferences.includes(option.id) ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Reviews From Tutors ({reviewsAboutMe.length})</h2>
          <p className="mt-1 text-xs text-ensena-muted">What tutors have said about lessons with you. These are permanent and can only be handled by Admin if reported.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {reviewsAboutMe.map((r) => (
              <li key={r.id}><ReviewCard review={r} onReport={() => setReportingReviewId(r.id)} /></li>
            ))}
            {reviewsAboutMe.length === 0 && <p className="py-4 text-center text-sm text-ensena-muted">No tutors have reviewed you yet.</p>}
          </ul>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <Target className="size-4.5 text-ensena-primary" /> Learning Goals
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {goals.map((g, i) => (
              <li key={i} className="rounded-xl border border-ensena-border p-2.5 text-sm text-ensena-ink">{g}</li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGoal()}
              placeholder="e.g. Score A1 in WAEC Mathematics"
              className="h-9 flex-1 rounded-full border border-ensena-border px-3 text-sm"
            />
            <button type="button" onClick={addGoal} aria-label="Add goal" className="flex size-9 items-center justify-center rounded-full bg-ensena-primary text-white">
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Parent / Guardian Details</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Parent Name</span>
              <input value={parentName} onChange={(e) => setParentName(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">{me.guardian ? "Parent Phone" : "Parent Contact"}</span>
              <input value={parentContact} onChange={(e) => setParentContact(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            {me.guardian && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Relationship</span>
                  <input value={me.guardian.relationship} readOnly disabled className="h-10 cursor-not-allowed rounded-lg border border-ensena-border bg-ensena-bg-soft px-3 text-sm text-ensena-muted" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Parent Email</span>
                  <input value={me.guardian.email} readOnly disabled className="h-10 cursor-not-allowed rounded-lg border border-ensena-border bg-ensena-bg-soft px-3 text-sm text-ensena-muted" />
                  <span className="text-xs text-ensena-muted">
                    {me.guardian.consentStatus === "confirmed" ? "Consent confirmed." : "Consent request sent — awaiting confirmation."} To change this email, contact Ensena Support.
                  </span>
                </label>
              </>
            )}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Emergency Contact</span>
              <input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Timezone</span>
              <input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Payment</h2>
          <div className="mt-3 flex flex-col gap-2.5">
            <ProfileLinkRow icon={CreditCard} label="Payment Methods" description="Manage saved cards and payment options" href="/student-dashboard/settings?tab=Payment Methods" />
            <ProfileLinkRow icon={Receipt} label="Payment History" description="View past bookings and receipts" href="/student-dashboard/transactions" />
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Account</h2>
          <div className="mt-3 flex flex-col gap-2.5">
            <ProfileLinkRow icon={Heart} label="Saved Tutors" description="Your tutor wishlist" href="/student-dashboard/saved-tutors" />
            <ProfileLinkRow icon={Settings} label="Account Settings" description="Name, email, phone and notification preferences" href="/student-dashboard/settings?tab=Account" />
            <ProfileLinkRow icon={Shield} label="Security" description="Password, two-factor authentication and login alerts" href="/student-dashboard/settings?tab=Security" />
          </div>
        </div>
      </div>

      <ReportReviewModal
        open={!!reportingReviewId}
        onClose={() => setReportingReviewId(null)}
        onSubmit={(reason, details) => {
          if (!reportingReviewId) return;
          reportReview(reportingReviewId, me.name, reason, details);
          setReportingReviewId(null);
        }}
      />
    </div>
  );
}
