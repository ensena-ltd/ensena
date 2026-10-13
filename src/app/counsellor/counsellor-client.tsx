"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock,
  Edit3,
  FileText,
  GraduationCap,
  HelpCircle,
  Lock,
  Tag,
  User,
  UserRound,
  Video,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingSuccess, type ConfirmedBooking } from "@/components/counsellor/booking-success";
import { SchedulePicker, type ScheduleValue } from "@/components/counsellor/schedule-picker";
import {
  academicLevelOptions,
  addMinutesToTime,
  counsellingSubjectOptions,
  counsellor,
  createDefaultIntake,
  examGoalOptions,
  formatFullDate,
  helpTopicOptions,
  isIntakeComplete,
  SESSION_DURATION_MINUTES,
  SESSION_LENGTH_LABEL,
  supportTypeOptions,
  type CounsellorIntake,
} from "@/lib/counsellor-data";
import { getPendingAction, clearPendingAction } from "@/lib/pending-action-store";
import { requireAuthOrSaveDraft } from "@/lib/require-auth";
import { cn } from "@/lib/utils";

interface CounsellorBookingDraft {
  intake: CounsellorIntake;
  booking: ScheduleValue;
}

const helpTopicIcons: Record<string, LucideIcon> = {
  "I'm struggling with a subject": BookOpen,
  "Exam preparation": FileText,
  "Choosing subjects or courses": GraduationCap,
  "Finding a tutor": User,
  "Study planning": CalendarDays,
  "I'm not sure what I need": HelpCircle,
  Other: Edit3,
};

function Section({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
      <h2 className="font-semibold text-ensena-ink">
        {number}. {title}
      </h2>
      {subtitle && <p className="mt-0.5 text-sm text-ensena-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CheckToggle({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border",
        checked ? "border-ensena-primary bg-ensena-primary text-white" : "border-ensena-border"
      )}
      aria-hidden="true"
    >
      {checked && <Check className="size-3" />}
    </span>
  );
}

function HelpTopicsFields({ intake, onToggle }: { intake: CounsellorIntake; onToggle: (topic: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {helpTopicOptions.map((topic) => {
        const Icon = helpTopicIcons[topic] ?? HelpCircle;
        const checked = intake.helpTopics.includes(topic);
        return (
          <button
            key={topic}
            type="button"
            aria-pressed={checked}
            onClick={() => onToggle(topic)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors",
              checked
                ? "border-ensena-primary bg-ensena-primary/5 text-ensena-ink"
                : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
            )}
          >
            <span className="flex items-center gap-3">
              <Icon className="size-4 shrink-0 text-ensena-muted" />
              {topic}
            </span>
            <CheckToggle checked={checked} />
          </button>
        );
      })}
    </div>
  );
}

function SupportTypeFields({ intake, onToggle }: { intake: CounsellorIntake; onToggle: (option: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {supportTypeOptions.map((option) => {
        const checked = intake.supportTypes.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={checked}
            onClick={() => onToggle(option)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              checked
                ? "border-ensena-primary bg-ensena-primary/5 text-ensena-ink"
                : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
            )}
          >
            {option}
            <CheckToggle checked={checked} />
          </button>
        );
      })}
    </div>
  );
}

function SelectField({
  label,
  placeholder,
  value,
  options,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ensena-ink">{label}</span>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function CounterTextarea({
  label,
  value,
  max,
  rows,
  placeholder,
  onChange,
}: {
  label?: string;
  value: string;
  max: number;
  rows: number;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-ensena-ink">{label}</span>}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => e.target.value.length <= max && onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full resize-none rounded-xl border border-ensena-border bg-transparent p-3.5 pb-6 text-sm outline-none focus-visible:border-ensena-primary"
        />
        <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-xs text-ensena-muted">
          {value.length}/{max}
        </span>
      </div>
    </div>
  );
}

function AcademicInfoFields({
  intake,
  onChange,
}: {
  intake: CounsellorIntake;
  onChange: (patch: Partial<CounsellorIntake>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SelectField
        label="Academic level"
        placeholder="Select your level"
        value={intake.academicLevel}
        options={academicLevelOptions}
        onChange={(v) => onChange({ academicLevel: v })}
      />
      <SelectField
        label="Subject(s) you need help with"
        placeholder="Select subject(s)"
        value={intake.subject}
        options={counsellingSubjectOptions}
        onChange={(v) => onChange({ subject: v })}
      />
      <SelectField
        label="Are you preparing for an exam or specific goal?"
        placeholder="Select an option"
        value={intake.examGoal}
        options={examGoalOptions}
        onChange={(v) => onChange({ examGoal: v })}
      />
      <CounterTextarea
        label="What are you hoping to achieve?"
        value={intake.goalText}
        max={200}
        rows={3}
        placeholder="e.g. Improve my Mathematics grade, prepare for WAEC, find the right tutor..."
        onChange={(v) => onChange({ goalText: v })}
      />
    </div>
  );
}

function BennyCard() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
        <Image src={counsellor.image} alt={counsellor.name} fill sizes="4rem" className="object-cover" />
      </div>
      <div>
        <p className="font-heading text-lg font-semibold text-ensena-ink">{counsellor.name}</p>
        <p className="text-sm text-ensena-muted">{counsellor.role}</p>
        <p className="text-sm text-ensena-muted">{counsellor.organization}</p>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-ensena-primary">
          <Tag className="size-3" /> Free for all students
        </span>
      </div>
    </div>
  );
}

function SessionSummary({ booking }: { booking: ScheduleValue | null }) {
  const rows: { icon: LucideIcon; label: string; value: string; valueClassName?: string }[] = [
    { icon: UserRound, label: "Counsellor", value: counsellor.name },
    { icon: Calendar, label: "Date", value: booking ? formatFullDate(booking.date) : "—" },
    { icon: Video, label: "Session type", value: "Video Call" },
    {
      icon: Clock,
      label: "Time",
      value: booking ? `${booking.time} – ${addMinutesToTime(booking.time, SESSION_DURATION_MINUTES)}` : "—",
    },
    { icon: Clock, label: "Duration", value: SESSION_LENGTH_LABEL },
    { icon: Tag, label: "Cost", value: "Free", valueClassName: "text-ensena-success" },
  ];

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <p className="font-semibold text-ensena-ink">Your session</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-1 lg:gap-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
            <dt className="flex items-center gap-1.5 text-ensena-muted">
              <row.icon className="size-3.5 shrink-0" />
              {row.label}
            </dt>
            <dd className={cn("text-right font-semibold text-ensena-ink", row.valueClassName)}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CounsellorClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Resuming after a require-auth.ts redirect to sign-in/sign-up — the
  // guest's intake answers and picked slot were saved before they left, so
  // they land back here fully filled in rather than starting over.
  const resumeId = searchParams.get("resume");
  const [resumedDraft] = useState<CounsellorBookingDraft | null>(() => {
    if (!resumeId) return null;
    const draft = getPendingAction<CounsellorBookingDraft>(resumeId);
    clearPendingAction(resumeId);
    return draft && draft.kind === "counsellor-booking" ? draft.data : null;
  });

  const [intake, setIntake] = useState<CounsellorIntake>(() => resumedDraft?.intake ?? createDefaultIntake());
  const [booking, setBooking] = useState<ScheduleValue | null>(() => resumedDraft?.booking ?? null);
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);

  function update(patch: Partial<CounsellorIntake>) {
    setIntake((prev) => ({ ...prev, ...patch }));
  }

  function toggleHelpTopic(topic: string) {
    setIntake((prev) => ({
      ...prev,
      helpTopics: prev.helpTopics.includes(topic)
        ? prev.helpTopics.filter((t) => t !== topic)
        : [...prev.helpTopics, topic],
    }));
  }

  function toggleSupportType(option: string) {
    setIntake((prev) => ({
      ...prev,
      supportTypes: prev.supportTypes.includes(option)
        ? prev.supportTypes.filter((t) => t !== option)
        : [...prev.supportTypes, option],
    }));
  }

  const canSchedule = isIntakeComplete(intake) && booking !== null;

  function handleSchedule() {
    if (!canSchedule || !booking) return;

    // A guest can fill out the whole intake and pick a time freely — the
    // account is only required at the actual point of commitment, right
    // here, with their answers preserved (see resumedDraft above).
    const gate = requireAuthOrSaveDraft("counsellor-booking", { intake, booking }, pathname);
    if (!gate.proceed) {
      router.push(gate.redirectUrl);
      return;
    }

    setConfirmed({ date: booking.date, time: booking.time, endTime: addMinutesToTime(booking.time, SESSION_DURATION_MINUTES) });
  }

  if (confirmed) {
    return <BookingSuccess booking={confirmed} intake={intake} />;
  }

  const scheduleCta = (
    <div>
      <Button
        disabled={!canSchedule}
        onClick={handleSchedule}
        className="h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        <CalendarCheck className="size-4" /> Schedule Free Session
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ensena-muted">
        <Lock className="size-3" /> Your information is private and secure.
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Narrow / single-column layout */}
      <div className="flex flex-col gap-8 lg:hidden">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-ensena-ink sm:text-3xl">
              Book a Free Counselling Session
            </h1>
            <p className="mt-2 text-ensena-muted">
              Meet with {counsellor.name}, {counsellor.organization}&apos;s {counsellor.role}.
            </p>
          </div>
          <div className="sm:w-72 sm:shrink-0">
            <BennyCard />
          </div>
        </div>

        <Section number={1} title="What do you need help with?" subtitle="Select all that apply">
          <HelpTopicsFields intake={intake} onToggle={toggleHelpTopic} />
        </Section>

        <Section number={2} title="Tell Benny a little more">
          <CounterTextarea
            value={intake.details}
            max={500}
            rows={4}
            placeholder="Tell us briefly what you're struggling with or what you'd like help with..."
            onChange={(v) => update({ details: v })}
          />
        </Section>

        <Section number={3} title="Your academic information">
          <AcademicInfoFields intake={intake} onChange={update} />
        </Section>

        <Section number={4} title="What kind of support are you looking for?" subtitle="Select all that apply">
          <SupportTypeFields intake={intake} onToggle={toggleSupportType} />
        </Section>

        <Section number={5} title="Choose a time with Benny" subtitle="Select an available time from Benny's schedule.">
          <SchedulePicker value={booking} onChange={setBooking} />
        </Section>

        <SessionSummary booking={booking} />

        {scheduleCta}
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:block">
        <h1 className="font-heading text-3xl font-semibold text-ensena-ink">Book a Free Counselling Session</h1>
        <p className="mt-2 text-ensena-muted">
          Meet with {counsellor.name}, {counsellor.organization}&apos;s {counsellor.role}.
        </p>

        <div className="mt-8 grid grid-cols-[1fr_380px] items-start gap-10">
          <div className="flex flex-col gap-8">
            <Section number={1} title="Tell us about what you need help with">
              <p className="text-sm font-medium text-ensena-ink">
                What would you like help with? <span className="font-normal text-ensena-muted">(Select all that apply)</span>
              </p>
              <div className="mt-3">
                <HelpTopicsFields intake={intake} onToggle={toggleHelpTopic} />
              </div>
              <p className="mt-5 text-sm font-medium text-ensena-ink">Tell Benny a little more about what&apos;s going on</p>
              <div className="mt-2">
                <CounterTextarea
                  value={intake.details}
                  max={500}
                  rows={4}
                  placeholder="Write a short description..."
                  onChange={(v) => update({ details: v })}
                />
              </div>
            </Section>

            <Section number={2} title="Your academic information">
              <AcademicInfoFields intake={intake} onChange={update} />
            </Section>

            <Section number={3} title="What kind of support are you looking for?">
              <p className="text-sm text-ensena-muted">What would be most helpful?</p>
              <div className="mt-3">
                <SupportTypeFields intake={intake} onToggle={toggleSupportType} />
              </div>
            </Section>
          </div>

          <div className="sticky top-24 flex flex-col gap-6">
            <BennyCard />
            <Section number={4} title="Choose a time with Benny" subtitle="Select an available time from Benny's schedule.">
              <SchedulePicker value={booking} onChange={setBooking} />
            </Section>
            <SessionSummary booking={booking} />
            {scheduleCta}
          </div>
        </div>
      </div>
    </div>
  );
}
