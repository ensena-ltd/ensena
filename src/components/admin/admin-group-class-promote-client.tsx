"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  Compass,
  GraduationCap,
  HelpCircle,
  Home,
  Mail,
  Megaphone,
  Monitor,
  Star,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTutorRating } from "@/hooks/use-reviews";
import {
  approvalCategoryFor,
  examFor,
  initialGroupClasses,
  promotionAudienceFor,
  type GroupClassRow,
} from "@/lib/admin-group-classes-data";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

type Duration = "7" | "14" | "30" | "custom";

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function fmt(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-ensena-primary" : "bg-ensena-border")}
    >
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export function AdminGroupClassPromoteClient({ classId }: { classId: string }) {
  const [classes] = useState<GroupClassRow[]>(initialGroupClasses);
  const groupClass = classes.find((c) => c.id === classId);

  const [channels, setChannels] = useState(
    groupClass?.promotionChannels ?? { homepage: false, studentDashboard: true, discovery: false, email: false, push: false }
  );
  const [duration, setDuration] = useState<Duration>("7");
  const [headline, setHeadline] = useState(groupClass?.promotionHeadline ?? "");
  const [description, setDescription] = useState(groupClass?.promotionDescription ?? "");
  const [started, setStarted] = useState(false);
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

  if (approvalCategoryFor(groupClass.status) !== "Approved") {
    return (
      <div>
        <Link href="/admin/group-classes" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
          <ChevronLeft className="size-4" /> Back to Group Classes
        </Link>
        <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
          <p className="text-sm text-ensena-muted">This class must be approved before it can be promoted.</p>
          <Link href={`/admin/group-classes/${classId}/review`} className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">Go to class review →</Link>
        </div>
      </div>
    );
  }

  const audience = promotionAudienceFor(groupClass);
  const now = new Date();
  const durationRanges: Record<Exclude<Duration, "custom">, string> = {
    "7": `${fmt(now)} – ${fmtYear(addDays(now, 7))}`,
    "14": `${fmt(now)} – ${fmtYear(addDays(now, 14))}`,
    "30": `${fmt(now)} – ${fmtYear(addDays(now, 30))}`,
  };

  return (
    <div>
      <Link href={`/admin/group-classes/${classId}/review`} className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to Group Classes
      </Link>

      <div className="mt-4">
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Promote Class</h1>
        <p className="mt-1 text-sm text-ensena-muted">Increase visibility of this class to the right students on Enseña.</p>
      </div>

      {/* Class summary */}
      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl"><Image src={groupClass.tutorImage} alt={groupClass.tutor} fill sizes="80px" className="object-cover" /></div>
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-semibold text-ensena-ink">{groupClass.title}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ensena-muted">
                Tutor: {groupClass.tutor}
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Verified Tutor ✓</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-ensena-muted">
                <span className="flex items-center gap-1 rounded-full bg-ensena-bg-soft px-2.5 py-1"><GraduationCap className="size-3.5" /> {groupClass.academicLevel}</span>
                <span className="flex items-center gap-1 rounded-full bg-ensena-bg-soft px-2.5 py-1">{examFor(groupClass.academicLevel)}</span>
                <span className="flex items-center gap-1 rounded-full bg-ensena-bg-soft px-2.5 py-1"><BookOpen className="size-3.5" /> {groupClass.subject}</span>
                <span className="flex items-center gap-1 rounded-full bg-ensena-bg-soft px-2.5 py-1"><Monitor className="size-3.5" /> {groupClass.mode}</span>
              </div>
              <p className="mt-2 text-sm text-ensena-ink">{formatNaira(groupClass.pricePerSession)} / session <span className="text-ensena-muted">· {groupClass.scheduleDays.split(",")[0]} · {groupClass.scheduleTime.split(" - ")[0]} · Duration: {groupClass.sessionDurationMins} min</span></p>
            </div>
          </div>

          <div className="flex shrink-0 gap-8 text-sm">
            <div>
              <p className="text-xs text-ensena-muted">Enrollment</p>
              <p className="font-semibold text-ensena-ink">{groupClass.studentsEnrolled} / {groupClass.maxStudents} students</p>
              <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-primary" style={{ width: `${Math.min(100, (groupClass.studentsEnrolled / groupClass.maxStudents) * 100)}%` }} /></div>
              <p className="mt-1 text-xs text-ensena-muted">{Math.max(0, groupClass.maxStudents - groupClass.studentsEnrolled)} seats left</p>
            </div>
            <div>
              <p className="text-xs text-ensena-muted">Created</p>
              <p className="font-semibold text-ensena-ink">{groupClass.createdDate}</p>
              <p className="mt-2.5 text-xs text-ensena-muted">Status</p>
              <span className="mt-0.5 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Approved</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Left */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Where do you want to promote this class?</h2>
            <p className="text-xs text-ensena-muted">Choose the channels where this class will be featured.</p>
            <div className="mt-4 flex flex-col gap-3">
              {[
                { key: "homepage" as const, icon: Home, title: "Ensena Homepage", tag: "Featured", tint: "bg-rose-100 text-rose-600", desc: "Show this class in the featured section on the homepage." },
                { key: "studentDashboard" as const, icon: Users, title: "Student Dashboard", tag: "Recommended", tint: "bg-violet-100 text-violet-600", desc: "Recommend this class to students who match the level, exam and subject." },
                { key: "discovery" as const, icon: Compass, title: "Group Classes Discovery", tag: "Featured", tint: "bg-amber-100 text-amber-600", desc: "Boost this class in the group classes discovery page." },
                { key: "email" as const, icon: Mail, title: "Email Notifications", tag: null, tint: "bg-blue-100 text-blue-600", desc: "Send this class to eligible students via email." },
                { key: "push" as const, icon: Bell, title: "Push Notifications", tag: null, tint: "bg-sky-100 text-sky-600", desc: "Send this class to eligible students via push notification." },
              ].map((row) => (
                <div key={row.key} className="flex items-start gap-3 rounded-xl border border-ensena-border p-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", row.tint)}><row.icon className="size-4.5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ensena-ink">
                      {row.title}
                      {row.tag && <span className="rounded-full bg-ensena-primary/10 px-2 py-0.5 text-[10px] font-semibold text-ensena-primary">{row.tag}</span>}
                    </p>
                    <p className="text-xs text-ensena-muted">{row.desc}</p>
                  </div>
                  <Toggle checked={channels[row.key]} onChange={() => setChannels((prev) => ({ ...prev, [row.key]: !prev[row.key] }))} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Promotion Duration</h2>
            <p className="text-xs text-ensena-muted">Set how long you want to promote this class.</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {([
                { key: "7" as const, label: "7 days" },
                { key: "14" as const, label: "14 days" },
                { key: "30" as const, label: "30 days" },
                { key: "custom" as const, label: "Custom" },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDuration(opt.key)}
                  className={cn("rounded-xl border p-3 text-left text-xs", duration === opt.key ? "border-ensena-primary bg-ensena-primary/5" : "border-ensena-border")}
                >
                  <span className="flex items-center gap-1.5 font-semibold text-ensena-ink">
                    <span className={cn("flex size-3.5 shrink-0 items-center justify-center rounded-full border", duration === opt.key ? "border-ensena-primary" : "border-ensena-border")}>
                      {duration === opt.key && <span className="size-1.5 rounded-full bg-ensena-primary" />}
                    </span>
                    {opt.label}
                  </span>
                  <span className="mt-1 block text-[11px] text-ensena-muted">{opt.key === "custom" ? "Choose start and end date" : durationRanges[opt.key]}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2.5 text-xs text-blue-700"><HelpCircle className="size-3.5 shrink-0" /> You can stop or update this promotion anytime.</p>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">Preview <span className="text-xs font-normal text-ensena-muted">(How students will see this class)</span> <HelpCircle className="size-3.5 text-ensena-muted" /></h2>
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
              <span className="flex w-fit items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 shadow-sm"><Star className="size-3 fill-rose-500 text-rose-500" /> Featured Class</span>
              <p className="mt-3 font-heading text-base font-semibold text-ensena-ink">{headline || groupClass.title}</p>
              <p className="text-xs text-ensena-muted">{groupClass.academicLevel} · {examFor(groupClass.academicLevel)} · {groupClass.subject}</p>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-ensena-ink">{groupClass.tutor} <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Verified Tutor</span></p>
              <p className="mt-1 flex items-center gap-1 text-xs text-ensena-ink"><Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews} reviews)</p>
              <p className="mt-1 text-xs text-ensena-muted">{groupClass.scheduleDays.split(",")[0]} · {groupClass.scheduleTime.split(" - ")[0]} · {groupClass.sessionDurationMins} minutes</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-rose-600">{formatNaira(groupClass.pricePerSession)} / session</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Recommended Audience</h2>
            <p className="text-xs text-ensena-muted">Students who will see this class.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-rose-50 p-3"><span className="flex size-8 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Users className="size-4" /></span><p className="mt-1.5 text-lg font-bold text-ensena-ink">{audience.totalMatching}</p><p className="text-xs text-ensena-muted">Total students <br />match this class</p></div>
              <div className="rounded-xl bg-violet-50 p-3"><span className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-violet-600"><GraduationCap className="size-4" /></span><p className="mt-1.5 text-lg font-bold text-ensena-ink">{audience.levelMatching}</p><p className="text-xs text-ensena-muted">{groupClass.academicLevel} students</p></div>
              <div className="rounded-xl bg-emerald-50 p-3"><span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><BookOpen className="size-4" /></span><p className="mt-1.5 text-lg font-bold text-ensena-ink">{audience.examMatching}</p><p className="text-xs text-ensena-muted">{examFor(groupClass.academicLevel)} students</p></div>
              <div className="rounded-xl bg-amber-50 p-3"><span className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-600"><BookOpen className="size-4" /></span><p className="mt-1.5 text-lg font-bold text-ensena-ink">{audience.subjectInterested}</p><p className="text-xs text-ensena-muted">Interested in <br />{groupClass.subject}</p></div>
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Promotion Message <span className="text-xs font-normal text-ensena-muted">(Optional)</span></h2>
            <p className="text-xs text-ensena-muted">Create a short message to highlight this class to students.</p>
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Headline</span>
                <input value={headline} onChange={(e) => setHeadline(e.target.value.slice(0, 80))} placeholder="e.g. Ace WAEC Mathematics with Expert Guidance" className="h-10 rounded-xl border border-ensena-border px-3 text-sm" />
                <span className="self-end text-[11px] text-ensena-muted">{headline.length}/80</span>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Short Description</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 160))} rows={3} placeholder="Join this focused class and master key topics." className="rounded-xl border border-ensena-border p-2.5 text-sm" />
                <span className="self-end text-[11px] text-ensena-muted">{description.length}/160</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-ensena-border pt-5">
        <Link href={`/admin/group-classes/${classId}/review`} className="flex h-11 items-center justify-center rounded-full border border-ensena-border px-6 text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft">Cancel</Link>
        <Button
          onClick={() => { setStarted(true); flash("Promotion started."); }}
          className="h-11 rounded-full bg-rose-600 px-6 text-sm font-semibold text-white hover:bg-rose-700"
        >
          <Megaphone className="size-4" /> {started ? "Promotion Active" : "Start Promotion"}
        </Button>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
