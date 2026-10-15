"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2, ChevronRight, Clock, CreditCard, Heart, HeartHandshake, Pencil, Plus, Receipt, Save, Settings, Shield, Star, Target, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { saveStudentIdentity, useStudentIdentity } from "@/components/student-dashboard/student-identity";
import { ageOn } from "@/lib/age";
import { supportTypeOptions } from "@/lib/academic-support-types";
import { requestGuardianConsent, resendGuardianConsent } from "@/lib/actions/auth";
import { saveStudentProfile } from "@/lib/actions/student-profile";
import { guardianRequirement, guardianRequirementMessage } from "@/lib/guardian-requirement";
import type { StudentReview, StudentStanding } from "@/lib/student-profile-server";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { isDegreeLevel, subjectsForCourse, subjectsForLevel } from "@/lib/student-onboarding-subjects";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const relationshipOptions = ["Parent", "Legal Guardian", "Other Family Member"];

function Card({ title, icon: Icon, children, id }: { title: React.ReactNode; icon?: LucideIcon; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="scroll-mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
        {Icon && <Icon className="size-4.5 text-ensena-primary" />} {title}
      </h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function LinkRow({ icon: Icon, label, description, href }: { icon: LucideIcon; label: string; description: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-ensena-border p-3.5 hover:bg-ensena-bg-soft">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ensena-ink">{label}</span>
        <span className="block text-xs text-ensena-muted">{description}</span>
      </span>
      <ChevronRight className="size-4 text-ensena-muted" />
    </Link>
  );
}

const chip = (on: boolean) =>
  cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", on ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft");

// The signed-in student's profile — everything read from and saved to
// Supabase (profiles, student_profiles, student_guardians, reviews).
const EXAMS = ["WAEC", "NECO", "JAMB", "UTME", "IGCSE", "GCE", "SAT", "IELTS", "TOEFL", "GRE", "GMAT", "BECE", "Common Entrance", "A-Level", "Post-UTME"];

// The exam a student is working towards, read from their goals and subjects.
function findExamGoal(texts: string[]): string {
  for (const t of texts) {
    const hit = EXAMS.find((e) => new RegExp(`\\b${e.replace("-", "\\-")}\\b`, "i").test(t));
    if (hit) return hit === "UTME" ? "JAMB" : hit;
  }
  return "";
}

export function StudentProfileReal({ reviews, standing = { founding: false, premium: false } }: { reviews: StudentReview[]; standing?: StudentStanding }) {
  const router = useRouter();
  const me = useStudentIdentity();
  const fileInput = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState(me.image);
  const [bio, setBio] = useState(me.bio);
  const [subjects, setSubjects] = useState<string[]>(me.subjects);
  const [customSubject, setCustomSubject] = useState("");
  const [supportTypes, setSupportTypes] = useState<string[]>(me.supportTypes);
  const [goals, setGoals] = useState<string[]>(me.learningGoals);
  const [newGoal, setNewGoal] = useState("");
  const [saving, setSaving] = useState(false);

  // Guardian
  const age = ageOn(me.dob);
  const requirement = guardianRequirement(me.dob, me.academicLevel);
  const [guardianName, setGuardianName] = useState(me.guardian?.fullName ?? "");
  const [guardianPhone, setGuardianPhone] = useState(me.guardian?.phone ?? "");
  const [showGuardianForm, setShowGuardianForm] = useState(requirement === "required");
  const [gName, setGName] = useState("");
  const [gRelationship, setGRelationship] = useState(relationshipOptions[0]);
  const [gEmail, setGEmail] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gConsent, setGConsent] = useState(false);
  const [addingGuardian, setAddingGuardian] = useState(false);
  const [resending, setResending] = useState(false);

  const catalogue = isDegreeLevel(me.academicLevel) ? subjectsForCourse(me.course, me.academicLevel) : subjectsForLevel(me.academicLevel, me.academicDetail);
  const subjectChips = [...catalogue, ...subjects.filter((s) => !catalogue.includes(s))];
  const levelLabel = [me.academicDetail || me.academicLevel, me.course].filter(Boolean).join(" · ");
  const examGoal = findExamGoal([...goals, ...subjects, me.goal]);
  const [editingLevel, setEditingLevel] = useState(false);
  const [levelDraft, setLevelDraft] = useState("");
  const [savingLevel, setSavingLevel] = useState(false);

  async function saveLevel() {
    const value = levelDraft.trim();
    if (!value) {
      toast.error("Enter your level, e.g. SSS2.");
      return;
    }
    setSavingLevel(true);
    const result = await saveStudentIdentity(me.id, { student: { academic_detail: value } });
    setSavingLevel(false);
    if (!result.ok) {
      toast.error("We couldn't update your level.");
      return;
    }
    setEditingLevel(false);
    toast.success("Level updated.");
    router.refresh();
  }

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function addSubject() {
    const v = customSubject.trim();
    if (!v) return;
    if (!subjects.some((s) => s.toLowerCase() === v.toLowerCase())) setSubjects((p) => [...p, v]);
    setCustomSubject("");
  }

  function addGoal() {
    const v = newGoal.trim();
    if (!v) return;
    if (goals.length >= 20) {
      toast.error("You can have up to 20 learning goals.");
      return;
    }
    setGoals((p) => [...p, v]);
    setNewGoal("");
  }

  async function uploadPhoto(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Your photo must be 5MB or smaller.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${me.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) {
      toast.error("We couldn't upload your photo. Please try again.");
      return;
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error: saveError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", me.id!);
    if (saveError) {
      toast.error("We couldn't save your photo. Please try again.");
      return;
    }
    setPhoto(url);
    toast.success("Profile photo updated.");
    router.refresh();
  }

  async function save() {
    if (subjects.length === 0) {
      toast.error("Pick at least one subject you want to learn.");
      return;
    }
    setSaving(true);
    const result = await saveStudentProfile({ bio, subjects, supportTypes, learningGoals: goals });
    let guardianOk = true;
    if (result.ok && me.guardian && (guardianName.trim() !== me.guardian.fullName || guardianPhone.trim() !== me.guardian.phone)) {
      if (!guardianName.trim() || !guardianPhone.trim()) {
        toast.error("Your parent/guardian needs a name and phone number.");
        guardianOk = false;
      } else {
        guardianOk = (await saveStudentIdentity(me.id, { guardian: { full_name: guardianName.trim(), phone: guardianPhone.trim() } })).ok;
        if (!guardianOk) toast.error("We couldn't update your parent/guardian's details.");
      }
    }
    setSaving(false);
    if (!result.ok) {
      toast.error(result.message ?? "We couldn't save your profile.");
      return;
    }
    if (guardianOk) toast.success("Profile saved.");
    router.refresh();
  }

  async function addGuardian() {
    if (!gName.trim() || !gEmail.trim() || !gPhone.trim()) {
      toast.error("Please fill in your parent/guardian's name, email and phone.");
      return;
    }
    if (!gConsent) {
      toast.error("Your parent or guardian needs to confirm consent.");
      return;
    }
    setAddingGuardian(true);
    const result = await requestGuardianConsent({ guardian: { fullName: gName.trim(), relationship: gRelationship, email: gEmail.trim(), phone: gPhone.trim() } });
    setAddingGuardian(false);
    if (result.status === "error") {
      toast.error(result.message ?? "We couldn't add your parent/guardian.");
      return;
    }
    toast.success(`We've emailed ${gName.trim().split(" ")[0]} to confirm consent.`);
    router.refresh();
  }

  async function resend() {
    setResending(true);
    const result = await resendGuardianConsent();
    setResending(false);
    if (result.status === "error") toast.error(result.message ?? "Couldn't resend the email.");
    else toast.success("Consent email sent again.");
  }

  const g = me.guardian;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Profile</h1>
          <p className="mt-1 text-sm text-ensena-muted">Manage your personal and academic information.</p>
        </div>
        <Button onClick={save} loading={saving} className="h-10 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-5 text-sm font-semibold text-white">
          <Save className="size-4" /> Save Changes
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {/* Header + bio */}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0">
              <div className="relative size-20 overflow-hidden rounded-full bg-ensena-bg-soft">
                <Image src={photo} alt={me.name} fill sizes="80px" className="object-cover" />
              </div>
              <button
                type="button"
                aria-label="Change profile photo"
                onClick={() => fileInput.current?.click()}
                className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-white bg-ensena-primary text-white shadow-sm"
              >
                <Camera className="size-3.5" />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadPhoto(file);
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ensena-ink">
                {me.name}
                {standing.founding && <FoundingBadge kind="Student" compact className="px-2.5 py-1 text-[11px]" />}
              </p>
              <p className="flex flex-wrap items-center gap-1 text-xs text-ensena-muted">
                {editingLevel ? (
                  <>
                    Level:
                    <input
                      autoFocus
                      value={levelDraft}
                      onChange={(e) => setLevelDraft(e.target.value.slice(0, 60))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveLevel();
                        if (e.key === "Escape") setEditingLevel(false);
                      }}
                      className="h-7 w-32 rounded-md border border-ensena-border px-2 text-xs text-ensena-ink"
                    />
                    <button type="button" onClick={() => void saveLevel()} disabled={savingLevel} className="font-semibold text-ensena-primary hover:underline disabled:opacity-60">
                      {savingLevel ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={() => setEditingLevel(false)} className="text-ensena-muted hover:underline">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {levelLabel ? <>Level: <span className="font-semibold text-ensena-ink">{levelLabel}</span></> : "Level not set"}
                    <button type="button" aria-label="Edit level" onClick={() => { setLevelDraft(me.academicDetail || me.academicLevel); setEditingLevel(true); }} className="text-ensena-muted hover:text-ensena-primary">
                      <Pencil className="size-3" />
                    </button>
                  </>
                )}
                {standing.premium && <span>· Premium Student</span>}
                {age !== null && <span>· Age {age}</span>}
              </p>
              <p className="flex items-center gap-1 text-xs text-ensena-muted">
                Exam Goal: <span className="font-semibold text-ensena-ink">{examGoal || "Not set"}</span>
                <button type="button" aria-label="Edit exam goal" onClick={() => document.getElementById("learning-goals")?.scrollIntoView({ behavior: "smooth" })} className="text-ensena-muted hover:text-ensena-primary">
                  <Pencil className="size-3" />
                </button>
              </p>
              <p className="text-xs text-ensena-muted">{me.email}</p>
            </div>
          </div>
          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder="Tell tutors a little about you — what you're studying and what you're aiming for."
              className="rounded-xl border border-ensena-border p-3 text-sm"
            />
          </label>
        </div>

        {/* Subjects */}
        <Card title="Subjects">
          <p className="text-xs text-ensena-muted">The subjects you want to learn are highlighted. Tap to add or remove.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {subjectChips.map((s) => (
              <button key={s} type="button" onClick={() => setSubjects((p) => toggle(p, s))} className={chip(subjects.includes(s))}>{s}</button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubject();
                }
              }}
              placeholder="Another subject"
              className="h-9 flex-1 rounded-full border border-ensena-border px-3 text-sm"
            />
            <button type="button" onClick={addSubject} aria-label="Add subject" className="flex size-9 items-center justify-center rounded-full bg-ensena-primary text-white">
              <Plus className="size-4" />
            </button>
          </div>
        </Card>

        {/* Support types */}
        <Card title="What do you usually need help with?">
          <p className="text-xs text-ensena-muted">Optional. Helps us personalise which tutors we show you. You can change this anytime.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {supportTypeOptions.map((o) => (
              <button key={o.id} type="button" onClick={() => setSupportTypes((p) => toggle(p, o.id))} className={chip(supportTypes.includes(o.id))}>{o.label}</button>
            ))}
          </div>
        </Card>

        {/* Reviews */}
        <Card title={`Reviews From Tutors (${reviews.length})`}>
          {reviews.length === 0 ? (
            <p className="text-sm text-ensena-muted">No reviews yet. Tutors can leave you a review after your lessons.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-ensena-border p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">
                        {r.reviewerImage ? <Image src={r.reviewerImage} alt={r.reviewerName} fill sizes="32px" className="object-cover" /> : r.reviewerName[0]}
                      </span>
                      <span className="text-sm font-semibold text-ensena-ink">{r.reviewerName}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={cn("size-3.5", i < r.rating ? "fill-amber-400 text-amber-400" : "text-ensena-border")} />
                      ))}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-ensena-ink">{r.comment}</p>}
                  <p className="mt-1 text-xs text-ensena-muted">{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Learning goals */}
        <Card title="Learning Goals" icon={Target} id="learning-goals">
          {goals.length === 0 ? (
            <p className="text-sm text-ensena-muted">No goals yet — add one below.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {goals.map((goal, i) => (
                <li key={`${goal}-${i}`} className="flex items-center justify-between gap-2 rounded-xl bg-ensena-bg-soft px-3 py-2 text-sm text-ensena-ink">
                  {goal}
                  <button type="button" aria-label={`Remove goal: ${goal}`} onClick={() => setGoals((p) => p.filter((_, j) => j !== i))} className="text-ensena-muted hover:text-rose-600">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <input
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value.slice(0, 200))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGoal();
                }
              }}
              placeholder="e.g. Score A1 in WAEC Mathematics"
              className="h-9 flex-1 rounded-full border border-ensena-border px-3 text-sm"
            />
            <button type="button" onClick={addGoal} aria-label="Add goal" className="flex size-9 items-center justify-center rounded-full bg-ensena-primary text-white">
              <Plus className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-ensena-muted">Remember to click Save Changes.</p>
        </Card>

        {/* Parent / Guardian */}
        <Card title="Parent / Guardian Details" icon={HeartHandshake} id="guardian">
          {g ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", g.consentStatus === "confirmed" ? "bg-ensena-success/10 text-ensena-success" : "bg-amber-100 text-amber-700")}>
                  {g.consentStatus === "confirmed" ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
                  {g.consentStatus === "confirmed" ? "Consent confirmed" : "Awaiting consent"}
                </span>
                {g.consentStatus !== "confirmed" && (
                  <button type="button" onClick={resend} disabled={resending} className="text-xs font-semibold text-ensena-primary hover:underline disabled:opacity-60">
                    {resending ? "Sending…" : "Resend consent email"}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Name</span>
                  <input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Phone</span>
                  <input value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Relationship</span>
                  <input value={g.relationship} readOnly disabled className="h-10 cursor-not-allowed rounded-lg border border-ensena-border bg-ensena-bg-soft px-3 text-sm text-ensena-muted" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Email</span>
                  <input value={g.email} readOnly disabled className="h-10 cursor-not-allowed rounded-lg border border-ensena-border bg-ensena-bg-soft px-3 text-sm text-ensena-muted" />
                </label>
              </div>
              <p className="mt-2 text-xs text-ensena-muted">To change their email, please contact Ensena Support.</p>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "flex items-start gap-2 rounded-xl p-3 text-sm",
                  requirement === "required" ? "bg-rose-50 text-rose-800" : requirement === "encouraged" ? "bg-amber-50 text-amber-900" : "bg-ensena-bg-soft text-ensena-ink"
                )}
              >
                {requirement === "required" ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <HeartHandshake className="mt-0.5 size-4 shrink-0" />}
                <span>
                  {requirement === "required" && <strong>Required: </strong>}
                  {guardianRequirementMessage(requirement, age)}
                </span>
              </div>
              {!showGuardianForm ? (
                <Button variant="outline" onClick={() => setShowGuardianForm(true)} className="mt-3 h-9 rounded-full border-ensena-border px-4 text-xs font-semibold">
                  <Plus className="size-3.5" /> Add parent or guardian
                </Button>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Full name *</span>
                    <input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="e.g. Grace Ejie" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Relationship *</span>
                    <select value={gRelationship} onChange={(e) => setGRelationship(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                      {relationshipOptions.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Email *</span>
                    <input type="email" value={gEmail} onChange={(e) => setGEmail(e.target.value)} placeholder="guardian@example.com" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Phone *</span>
                    <input type="tel" value={gPhone} onChange={(e) => setGPhone(e.target.value)} placeholder="0800 000 0000" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                  </label>
                  <label className="flex items-start gap-2 text-xs text-ensena-muted sm:col-span-2">
                    <input type="checkbox" checked={gConsent} onChange={(e) => setGConsent(e.target.checked)} className="mt-0.5 size-4 accent-ensena-primary" />
                    I confirm this person is my parent or legal guardian. We&apos;ll email them to confirm consent.
                  </label>
                  <div className="sm:col-span-2">
                    <Button onClick={addGuardian} loading={addingGuardian} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                      Send consent request
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Payment & Account (unchanged for now) */}
        <Card title="Payment">
          <div className="flex flex-col gap-2.5">
            <LinkRow icon={CreditCard} label="Payment Methods" description="Manage saved cards and payment options" href="/student-dashboard/settings?tab=Payment Methods" />
            <LinkRow icon={Receipt} label="Payment History" description="View past bookings and receipts" href="/student-dashboard/transactions" />
          </div>
        </Card>
        <Card title="Account">
          <div className="flex flex-col gap-2.5">
            <LinkRow icon={Heart} label="Saved Tutors" description="Your tutor wishlist" href="/student-dashboard/saved-tutors" />
            <LinkRow icon={Settings} label="Account Settings" description="Name, email, phone and notification preferences" href="/student-dashboard/settings?tab=Account" />
            <LinkRow icon={Shield} label="Security" description="Password, two-factor authentication and login alerts" href="/student-dashboard/settings?tab=Security" />
          </div>
        </Card>
      </div>
    </div>
  );
}
