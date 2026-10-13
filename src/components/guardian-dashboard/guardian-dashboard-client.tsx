"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  HeartHandshake,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";

import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { Button } from "@/components/ui/button";
import { childLevelLabel, initialsOf, useGuardianIdentity, type GuardianChild } from "@/components/guardian-dashboard/guardian-identity";
import { formatNaira } from "@/lib/format";
import { linkedChildren } from "@/lib/guardian-dashboard-data";
import { learningGoal, tutorAssignments } from "@/lib/study-planner-data";
import { studentOverallProgress, studentUpcomingLessons } from "@/lib/student-dashboard-data";
import { isTutorVerifiedByName } from "@/lib/tutor-verification-store";
import { cn } from "@/lib/utils";

// Real accounts (me.isReal) show the linked child's actual details from the
// database; lessons, assignments, progress and payments aren't stored in
// Supabase yet, so those show empty states rather than someone else's demo
// records. Demo mode (no Supabase) keeps the original demo content.

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ageFrom(iso: string) {
  if (!iso) return null;
  const dob = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  return age;
}

function Card({ title, icon, action, children }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-heading text-base font-semibold text-ensena-ink">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ensena-muted">{label}</p>
      <p className="break-words text-sm font-medium text-ensena-ink">{value || <span className="font-normal text-ensena-muted">Not provided</span>}</p>
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 rounded-xl bg-ensena-bg-soft px-3.5 py-3 text-sm text-ensena-muted">{children}</p>;
}

function Avatar({ name, image, size }: { name: string; image: string | null; size: "md" | "lg" }) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ensena-primary/10 font-semibold text-ensena-primary",
        size === "lg" ? "size-14 text-lg" : "size-10 text-sm"
      )}
    >
      {image ? <Image src={image} alt={name} fill sizes={size === "lg" ? "56px" : "40px"} className="object-cover" /> : initialsOf(name)}
    </div>
  );
}

export function GuardianDashboardClient() {
  const me = useGuardianIdentity();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const child: GuardianChild | undefined = me.children.find((c) => c.id === selectedId) ?? me.children[0];
  const demoChild = linkedChildren[0];

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2400);
  }

  const donutSegments = useMemo(() => {
    const total = studentOverallProgress.subjects.reduce((s, x) => s + x.pct, 0);
    return studentOverallProgress.subjects.reduce<{ subject: (typeof studentOverallProgress.subjects)[number]; dash: number; offset: number }[]>(
      (acc, subject) => {
        const dash = (subject.pct / total) * 100;
        const previousOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
        return [...acc, { subject, dash, offset: previousOffset }];
      },
      []
    );
  }, []);

  if (!child) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-ensena-border bg-ensena-surface p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><HeartHandshake className="size-7" /></span>
        <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink">Welcome, {me.name.split(" ")[0]}</h1>
        <p className="mt-2 text-sm text-ensena-muted">
          No child is linked to your Guardian Dashboard yet. When a student adds you as their parent or guardian during sign-up, you&apos;ll get a consent email and they&apos;ll appear here.
        </p>
        <Button variant="outline" nativeButton={false} render={<Link href="/contact" />} className="mt-5 h-10 rounded-full border-ensena-border px-5 text-sm font-medium">
          <MessageSquare className="size-4" /> Contact Ensena
        </Button>
      </div>
    );
  }

  const real = me.isReal;
  const confirmed = child.consentStatus === "confirmed";
  const age = ageFrom(child.dob);
  const levelLabel = real ? childLevelLabel(child) : demoChild.level;

  return (
    <div>
      {me.children.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {me.children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                c.id === child.id ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              {c.firstName}
            </button>
          ))}
        </div>
      )}

      <div className={cn("flex items-start gap-3 rounded-xl p-3 text-sm text-ensena-ink", confirmed ? "bg-ensena-success/10" : "bg-amber-50")}>
        {confirmed ? <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ensena-success" /> : <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />}
        {confirmed
          ? <>You&apos;re viewing {child.firstName}&apos;s learning account as their {child.relationship.toLowerCase()}. Bookings and payments require your approval.</>
          : <>{child.firstName}&apos;s consent is still pending. Open the consent email we sent you to confirm.</>}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={child.name} image={child.image} size="lg" />
          <div>
            <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{child.firstName}&apos;s Learning</h1>
            <p className="text-sm text-ensena-muted">
              {levelLabel ? <>Level: {levelLabel}</> : "Level not set yet"}
              {!real && <> · Tutor: {demoChild.tutor}</>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => flash("Guardian booking management isn't available yet.")} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            Manage Bookings
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/contact" />} className="h-10 rounded-full border-ensena-border px-5 text-sm font-medium">
            <MessageSquare className="size-4" /> Contact Ensena
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          {real && (
            <Card title={`${child.firstName}'s Details`} icon={<UserRound className="size-4 text-ensena-primary" />}>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Detail label="Full name" value={child.name} />
                <Detail label="Date of birth" value={child.dob ? `${formatDate(child.dob)}${age !== null ? ` (age ${age})` : ""}` : ""} />
                <Detail label="Email" value={child.email} />
                <Detail label="Phone" value={child.phone} />
                <Detail label="Academic level" value={child.academicLevel} />
                <Detail
                  label={child.academicLevel === "Secondary" ? "Class" : child.academicLevel === "Exams" ? "Exam" : child.academicLevel === "Undergraduate" ? "Year" : "Details"}
                  value={child.academicDetail}
                />
                {child.course && <Detail label="Course" value={child.course} />}
              </div>
            </Card>
          )}

          <Card title="Learning Plan" icon={<Target className="size-4 text-ensena-primary" />}>
            {real && !child.progressShared ? (
              <EmptyNote>{child.firstName} has chosen not to share their learning plan and progress. They can turn this on under Settings → Privacy.</EmptyNote>
            ) : real ? (
              <>
                <p className="mt-3 text-xs text-ensena-muted">Goal</p>
                <p className="text-sm font-semibold text-ensena-ink">{child.goal || <span className="font-normal text-ensena-muted">{child.firstName} hasn&apos;t set a goal yet.</span>}</p>
                <p className="mt-3 text-xs text-ensena-muted">Subjects {child.firstName} wants help with</p>
                {child.subjects.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {child.subjects.map((s) => <span key={s} className="rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">{s}</span>)}
                  </div>
                ) : (
                  <p className="text-sm text-ensena-muted">No subjects chosen yet.</p>
                )}
              </>
            ) : (
              <>
                <p className="mt-2 text-sm font-semibold text-ensena-ink">{learningGoal.title}: {learningGoal.target}</p>
                <p className="text-xs text-ensena-muted">Target exam: {learningGoal.examDate}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-success" style={{ width: `${learningGoal.progressPct}%` }} /></div>
                  <span className="text-xs font-semibold text-ensena-ink">{learningGoal.progressPct}%</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {learningGoal.focusAreas.map((f) => <span key={f} className="rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">{f}</span>)}
                </div>
              </>
            )}
          </Card>

          <Card title="Upcoming Lessons" icon={<Calendar className="size-4 text-ensena-primary" />}>
            {real ? (
              <EmptyNote>No lessons booked yet. Once {child.firstName} books a lesson or Discovery Session, it will show here.</EmptyNote>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {studentUpcomingLessons.map((lesson) => (
                  <div key={lesson.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-ensena-border p-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full"><Image src={lesson.tutorImage} alt={lesson.tutor} fill sizes="40px" className="object-cover" /></div>
                    <div className="min-w-[140px] flex-1">
                      <p className="text-sm font-semibold text-ensena-ink">{lesson.subject}</p>
                      <p className="text-xs text-ensena-muted">{lesson.tutor} · {lesson.date} · {lesson.time}</p>
                    </div>
                    <span className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">{lesson.mode}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Assignments" icon={<BookOpen className="size-4 text-ensena-primary" />}>
            {real ? (
              <EmptyNote>No assignments yet. Homework set by {child.firstName}&apos;s tutors will appear here.</EmptyNote>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {tutorAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ensena-ink">{a.title}</p>
                      <p className="truncate text-xs text-ensena-muted">From {a.fromTutor} · Due {a.due}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", a.status === "Submitted" ? "bg-ensena-success/10 text-ensena-success" : "bg-amber-100 text-amber-700")}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {real && (
            <Card
              title="Your Details"
              icon={<HeartHandshake className="size-4 text-ensena-primary" />}
              action={
                <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", confirmed ? "bg-ensena-success/10 text-ensena-success" : "bg-amber-100 text-amber-700")}>
                  {confirmed ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
                  {confirmed ? "Consent given" : "Consent pending"}
                </span>
              }
            >
              <div className="mt-4 flex items-center gap-3">
                <Avatar name={me.name} image={me.image} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ensena-ink">{me.name}</p>
                  <p className="text-xs text-ensena-muted">{child.relationship} of {child.firstName}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-sm">
                <span className="flex items-center gap-1.5 break-all text-ensena-ink"><Mail className="size-3.5 shrink-0 text-ensena-muted" /> {me.email}</span>
                {me.phone && <span className="flex items-center gap-1.5 text-ensena-ink"><Phone className="size-3.5 shrink-0 text-ensena-muted" /> {me.phone}</span>}
              </div>
              {confirmed && child.consentedAt && <p className="mt-3 text-xs text-ensena-muted">Consent confirmed on {formatDate(child.consentedAt)}.</p>}
            </Card>
          )}

          <Card
            title="Progress"
            icon={<GraduationCap className="size-4 text-ensena-primary" />}
            action={!real && <button type="button" onClick={() => flash("A detailed guardian progress report isn't available yet.")} className="text-xs font-semibold text-ensena-primary hover:underline">View full report</button>}
          >
            {real && !child.progressShared ? (
              <EmptyNote>{child.firstName} has chosen not to share their progress.</EmptyNote>
            ) : real ? (
              <EmptyNote>Progress will appear after {child.firstName}&apos;s first completed lessons.</EmptyNote>
            ) : (
              <div className="mt-4 flex items-center gap-4">
                <div className="relative flex size-24 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 42 42" className="size-24 -rotate-90">
                    <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#EAECEF" strokeWidth="5" />
                    {donutSegments.map(({ subject, dash, offset }) => (
                      <circle key={subject.subject} cx="21" cy="21" r="15.9" fill="transparent" stroke={subject.color} strokeWidth="5" strokeDasharray={`${dash} ${100 - dash}`} strokeDashoffset={-offset} />
                    ))}
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <p className="text-lg font-semibold text-ensena-ink">{studentOverallProgress.overall}%</p>
                  </div>
                </div>
                <div className="flex-1 text-xs">
                  {studentOverallProgress.subjects.map((s) => (
                    <div key={s.subject} className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-1.5 text-ensena-muted"><span className="size-2 rounded-full" style={{ backgroundColor: s.color }} /> {s.subject}</span>
                      <span className="font-semibold text-ensena-ink">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Payments" icon={<CreditCard className="size-4 text-ensena-primary" />}>
            {real ? (
              <EmptyNote>No payments yet.</EmptyNote>
            ) : (
              <>
                <p className="mt-2 text-sm text-ensena-muted">Recent lesson payment</p>
                <p className="text-xl font-semibold text-ensena-ink">{formatNaira(3000)}</p>
                <p className="text-xs text-ensena-muted">Mathematics · Adaeze Okonkwo</p>
                <Button onClick={() => flash("A full guardian payment history isn't available yet.")} variant="outline" className="mt-3 h-9 w-full rounded-full border-ensena-border text-xs font-medium">
                  View Payment History
                </Button>
              </>
            )}
          </Card>

          <Card title="Bookings" icon={<Calendar className="size-4 text-ensena-primary" />}>
            <p className="mt-2 text-xs text-ensena-muted">All new lessons and Discovery Sessions for {child.firstName} need your confirmation before they&apos;re booked.</p>
            <Button onClick={() => flash("Guardian booking approval isn't available yet.")} className="mt-3 h-9 w-full rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
              Review Pending Bookings
            </Button>
          </Card>

          {real ? (
            <Card title="Tutor" icon={<UserRound className="size-4 text-ensena-primary" />}>
              <EmptyNote>{child.firstName} hasn&apos;t booked a tutor yet.</EmptyNote>
              <Button variant="outline" nativeButton={false} render={<Link href="/find-teachers" />} className="mt-3 h-9 w-full rounded-full border-ensena-border text-xs font-medium">
                Browse tutors
              </Button>
            </Card>
          ) : (
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                <VerifiedTutorBadge tutorName={demoChild.tutor} /> {demoChild.tutor}
              </p>
              <p className="text-xs text-ensena-muted">{child.firstName}&apos;s current tutor</p>
              <div className="mt-2 flex items-center gap-2.5">
                <div className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={demoChild.tutorImage} alt={demoChild.tutor} fill sizes="36px" className="object-cover" /></div>
                {!isTutorVerifiedByName(demoChild.tutor) && <span className="text-xs text-ensena-muted">Not yet verified</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
