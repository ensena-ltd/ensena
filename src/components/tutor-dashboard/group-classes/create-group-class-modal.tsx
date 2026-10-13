"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { academicLevels } from "@/lib/data";
import { classGradeOptionsFor } from "@/lib/class-grade-taxonomy";
import { formatNaira } from "@/lib/format";
import {
  DURATION_MINUTES_OPTIONS,
  LENGTH_WEEKS_OPTIONS,
  WEEKDAY_NAMES,
  daysToAbbrevString,
  generateSessionDates,
  submitGroupClass,
  timeRangeLabel,
  type EnrollmentDeadlineType,
  type SessionDurationMinutes,
} from "@/lib/group-class-submission-store";
import { to12HourDisplay } from "@/lib/time-format";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Details", "Class Size", "Schedule", "Pricing", "Review"];
const MIN_CAPACITY = 2;
const MAX_CAPACITY = 10;

const enrollmentDeadlineOptions: { type: EnrollmentDeadlineType; label: string }[] = [
  { type: "atStart", label: "At class start" },
  { type: "1dayBefore", label: "1 day before" },
  { type: "3daysBefore", label: "3 days before" },
  { type: "1weekBefore", label: "1 week before" },
  { type: "custom", label: "Custom date" },
];

function formatDateLong(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-ensena-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-ensena-muted">{hint}</span>}
    </label>
  );
}

const inputClass = "h-10 rounded-lg border border-ensena-border px-3 text-sm";

export function CreateGroupClassModal({
  open,
  onClose,
  tutorName,
  tutorImage,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  tutorName: string;
  tutorImage: string;
  onSubmitted: (message: string) => void;
}) {
  const [step, setStep] = useState(1);

  // Step 1 — Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState(academicLevels[0]?.label ?? "Secondary");
  // The precise class/grade this class targets — contextual to the broad
  // Educational Level above (e.g. Secondary -> JSS1..SS3). Reset whenever
  // the Educational Level changes so a stale grade from a different bucket
  // can never be submitted.
  const [classGrade, setClassGrade] = useState(() => classGradeOptionsFor(academicLevels[0]?.label ?? "Secondary")[0] ?? "");
  const classGradeOptions = classGradeOptionsFor(level);
  function handleLevelChange(next: string) {
    setLevel(next);
    setClassGrade(classGradeOptionsFor(next)[0] ?? "");
  }
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [prerequisites, setPrerequisites] = useState("");

  // Step 2 — Class Size
  const [minStudents, setMinStudents] = useState(2);
  const [maxStudents, setMaxStudents] = useState(6);

  // Step 3 — Schedule
  const [startDateISO, setStartDateISO] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [startTime24, setStartTime24] = useState("17:00");
  const [durationMinutes, setDurationMinutes] = useState<SessionDurationMinutes>(60);
  const [lengthMode, setLengthMode] = useState<"weeks" | "custom">("weeks");
  const [lengthWeeks, setLengthWeeks] = useState(4);
  const [customEndDateISO, setCustomEndDateISO] = useState("");
  const [excludedDatesISO, setExcludedDatesISO] = useState<string[]>([]);
  const [enrollmentDeadlineType, setEnrollmentDeadlineType] = useState<EnrollmentDeadlineType>("atStart");
  const [enrollmentDeadlineCustom, setEnrollmentDeadlineCustom] = useState("");
  const [showAllSessions, setShowAllSessions] = useState(false);

  // Step 4 — Pricing
  const [pricePerSession, setPricePerSession] = useState(1500);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTimeLabel = to12HourDisplay(startTime24);

  const sessionDates = useMemo(() => {
    if (!startDateISO || days.length === 0) return [];
    return generateSessionDates({
      startDateISO,
      days,
      lengthWeeks: lengthMode === "weeks" ? lengthWeeks : null,
      customEndDateISO: lengthMode === "custom" ? customEndDateISO : undefined,
      excludedDatesISO,
    });
  }, [startDateISO, days, lengthMode, lengthWeeks, customEndDateISO, excludedDatesISO]);

  const scheduledValue = pricePerSession * sessionDates.length;

  function toggleDay(day: string) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
    setExcludedDatesISO([]); // the generated set changed — stale exclusions no longer make sense
  }

  function toggleExcluded(dateISO: string) {
    setExcludedDatesISO((prev) => (prev.includes(dateISO) ? prev.filter((d) => d !== dateISO) : [...prev, dateISO]));
  }

  function reset() {
    setStep(1);
    setTitle("");
    setDescription("");
    setSubject("");
    setTopic("");
    setAudience("");
    setPrerequisites("");
    setMinStudents(2);
    setMaxStudents(6);
    setStartDateISO("");
    setDays([]);
    setStartTime24("17:00");
    setDurationMinutes(60);
    setLengthMode("weeks");
    setLengthWeeks(4);
    setCustomEndDateISO("");
    setExcludedDatesISO([]);
    setEnrollmentDeadlineType("atStart");
    setEnrollmentDeadlineCustom("");
    setShowAllSessions(false);
    setPricePerSession(1500);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const step1Valid = title.trim() !== "" && subject.trim() !== "";
  const step2Valid = minStudents >= MIN_CAPACITY && maxStudents <= MAX_CAPACITY && maxStudents >= minStudents;
  const step3Valid =
    startDateISO !== "" &&
    days.length > 0 &&
    (lengthMode === "weeks" || (lengthMode === "custom" && customEndDateISO > startDateISO)) &&
    (enrollmentDeadlineType !== "custom" || enrollmentDeadlineCustom !== "") &&
    sessionDates.length > 0;
  const step4Valid = pricePerSession > 0;

  const canAdvance = step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : step === 4 ? step4Valid : true;

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitGroupClass({
        title: title.trim(),
        description,
        subject: subject.trim(),
        academicLevel: level,
        classGrade: classGrade || undefined,
        topic: topic.trim() || undefined,
        audience: audience.trim() || undefined,
        prerequisites: prerequisites.trim() || undefined,
        minStudents,
        maxStudents,
        pricePerSession,
        startDateISO,
        days,
        startTime: startTimeLabel,
        durationMinutes,
        lengthWeeks: lengthMode === "weeks" ? lengthWeeks : null,
        customEndDateISO: lengthMode === "custom" ? customEndDateISO : undefined,
        excludedDatesISO: excludedDatesISO.length > 0 ? excludedDatesISO : undefined,
        enrollmentDeadline: { type: enrollmentDeadlineType, customDateISO: enrollmentDeadlineType === "custom" ? enrollmentDeadlineCustom : undefined },
        tutorName,
        tutorImage,
      });
      handleClose();
      onSubmitted("Class submitted for review. We'll notify you once it's been approved.");
    } catch {
      setError("Something went wrong submitting your class. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create Group Class" widthClassName="max-w-2xl">
      <div className="flex flex-col gap-4">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            return (
              <div key={label} className="flex shrink-0 items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    n < step ? "bg-ensena-success text-white" : n === step ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-muted"
                  )}
                >
                  {n < step ? <Check className="size-3.5" /> : n}
                </span>
                <span className={cn("whitespace-nowrap text-xs font-medium", n === step ? "text-ensena-ink" : "text-ensena-muted")}>{label}</span>
                {n < STEP_LABELS.length && <span className="mx-1 h-px w-4 shrink-0 bg-ensena-border" />}
              </div>
            );
          })}
        </div>

        {/* Step 1 — Details */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <Field label="Class title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. WAEC Biology Success" className={inputClass} />
            </Field>
            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What will students learn in this class?" className="rounded-lg border border-ensena-border px-3 py-2 text-sm" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Educational Level">
                <select value={level} onChange={(e) => handleLevelChange(e.target.value)} className={inputClass}>
                  {academicLevels.map((l) => (
                    <option key={l.label} value={l.label}>{l.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Subject">
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Biology" className={inputClass} />
              </Field>
            </div>
            {classGradeOptions.length > 0 && (
              <Field label="Class / Grade" hint="Which specific class is this for?">
                <select value={classGrade} onChange={(e) => setClassGrade(e.target.value)} className={inputClass}>
                  {classGradeOptions.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Topic / learning goal" hint="Optional">
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Mastering cell biology for WAEC" className={inputClass} />
            </Field>
            <Field label="Who this class is for" hint="Optional">
              <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. SS2–SS3 students preparing for WAEC" className={inputClass} />
            </Field>
            <Field label="Prerequisites" hint="Optional">
              <input value={prerequisites} onChange={(e) => setPrerequisites(e.target.value)} placeholder="e.g. Basic understanding of cell structure" className={inputClass} />
            </Field>
          </div>
        )}

        {/* Step 2 — Class Size */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ensena-muted">Choose how many students this class can hold. 2–4 works well for a highly interactive small group; 5–10 suits a larger revision/lecture-style class, but the choice is yours.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum learners" hint="The class won't be expected to run below this">
                <select
                  value={minStudents}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMinStudents(v);
                    if (maxStudents < v) setMaxStudents(v);
                  }}
                  className={inputClass}
                >
                  {Array.from({ length: MAX_CAPACITY - MIN_CAPACITY + 1 }, (_, i) => i + MIN_CAPACITY).map((n) => (
                    <option key={n} value={n}>{n} students</option>
                  ))}
                </select>
              </Field>
              <Field label="Maximum learners" hint={`Platform maximum is ${MAX_CAPACITY}`}>
                <select value={maxStudents} onChange={(e) => setMaxStudents(Number(e.target.value))} className={inputClass}>
                  {Array.from({ length: MAX_CAPACITY - minStudents + 1 }, (_, i) => i + minStudents).map((n) => (
                    <option key={n} value={n}>{n} students</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* Step 3 — Schedule */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <input type="date" value={startDateISO} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setStartDateISO(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Start time">
                <input type="time" value={startTime24} onChange={(e) => setStartTime24(e.target.value)} className={inputClass} />
              </Field>
            </div>

            <div>
              <p className="text-xs font-medium text-ensena-muted">Which days will you teach?</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {WEEKDAY_NAMES.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium",
                      days.includes(day) ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                    )}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Session duration">
              <div className="flex flex-wrap gap-1.5">
                {DURATION_MINUTES_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDurationMinutes(m)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium",
                      durationMinutes === m ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                    )}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </Field>

            <div>
              <p className="text-xs font-medium text-ensena-muted">How long will this class run?</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {LENGTH_WEEKS_OPTIONS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => { setLengthMode("weeks"); setLengthWeeks(w); }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium",
                      lengthMode === "weeks" && lengthWeeks === w ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                    )}
                  >
                    {w} week{w > 1 ? "s" : ""}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setLengthMode("custom")}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium",
                    lengthMode === "custom" ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                  )}
                >
                  Custom
                </button>
              </div>
              {lengthMode === "custom" && (
                <input
                  type="date"
                  value={customEndDateISO}
                  min={startDateISO || undefined}
                  onChange={(e) => setCustomEndDateISO(e.target.value)}
                  className={cn(inputClass, "mt-2")}
                />
              )}
            </div>

            <Field label="Enrollment closes">
              <select
                value={enrollmentDeadlineType}
                onChange={(e) => setEnrollmentDeadlineType(e.target.value as EnrollmentDeadlineType)}
                className={inputClass}
              >
                {enrollmentDeadlineOptions.map((o) => (
                  <option key={o.type} value={o.type}>{o.label}</option>
                ))}
              </select>
              {enrollmentDeadlineType === "custom" && (
                <input
                  type="date"
                  value={enrollmentDeadlineCustom}
                  max={startDateISO || undefined}
                  onChange={(e) => setEnrollmentDeadlineCustom(e.target.value)}
                  className={cn(inputClass, "mt-2")}
                />
              )}
            </Field>

            {/* Live schedule preview */}
            {startDateISO && days.length > 0 && (
              <div className="rounded-xl border border-ensena-border bg-ensena-bg-soft p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">Class Schedule</p>
                {sessionDates.length > 0 ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-ensena-ink">
                      {formatDateLong(sessionDates[0])} – {formatDateLong(sessionDates[sessionDates.length - 1])}
                    </p>
                    <p className="text-sm text-ensena-ink">Every {daysToAbbrevString(days)} · {timeRangeLabel(startTimeLabel, durationMinutes)}</p>
                    <p className="mt-1 text-sm font-semibold text-ensena-primary">{sessionDates.length} sessions</p>
                    <button type="button" onClick={() => setShowAllSessions((v) => !v)} className="mt-2 text-xs font-medium text-ensena-primary hover:underline">
                      {showAllSessions ? "Hide sessions" : "View all sessions"}
                    </button>
                    {showAllSessions && (
                      <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
                        {generateSessionDates({ startDateISO, days, lengthWeeks: lengthMode === "weeks" ? lengthWeeks : null, customEndDateISO: lengthMode === "custom" ? customEndDateISO : undefined })
                          .map((dateISO) => {
                            const excluded = excludedDatesISO.includes(dateISO);
                            return (
                              <li key={dateISO} className={cn("flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs", excluded && "opacity-50")}>
                                <span className={cn(excluded && "line-through")}>{formatDateLong(dateISO)}</span>
                                <button type="button" onClick={() => toggleExcluded(dateISO)} className="text-ensena-muted hover:text-rose-600">
                                  {excluded ? "Restore" : <X className="size-3.5" />}
                                </button>
                              </li>
                            );
                          })}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-ensena-muted">Pick a start date, days and length to see your schedule.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Pricing */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <Field label="Price per session (₦)" hint="Students choose how they'd like to pay for the class at checkout. You only set the per-session price.">
              <input type="number" min={0} step={100} value={pricePerSession} onChange={(e) => setPricePerSession(Number(e.target.value))} className={inputClass} />
            </Field>
            <div className="rounded-xl border border-ensena-border bg-ensena-bg-soft p-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ensena-muted">{sessionDates.length} sessions × {formatNaira(pricePerSession)}</span>
                <span className="font-semibold text-ensena-ink">Scheduled value: {formatNaira(scheduledValue)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 5 — Review */}
        {step === 5 && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-ensena-muted">Class title</span><span className="font-medium text-ensena-ink">{title}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Subject</span><span className="font-medium text-ensena-ink">{subject}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Educational Level</span><span className="font-medium text-ensena-ink">{level}</span></div>
            {classGrade && (
              <div className="flex justify-between"><span className="text-ensena-muted">Class / Grade</span><span className="font-medium text-ensena-ink">{classGrade}</span></div>
            )}
            <div className="flex justify-between"><span className="text-ensena-muted">Start date</span><span className="font-medium text-ensena-ink">{formatDateLong(startDateISO)}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">End date</span><span className="font-medium text-ensena-ink">{sessionDates.length > 0 ? formatDateLong(sessionDates[sessionDates.length - 1]) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Days</span><span className="font-medium text-ensena-ink">{daysToAbbrevString(days)}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Time</span><span className="font-medium text-ensena-ink">{timeRangeLabel(startTimeLabel, durationMinutes)}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Duration</span><span className="font-medium text-ensena-ink">{durationMinutes} minutes</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Number of sessions</span><span className="font-medium text-ensena-ink">{sessionDates.length}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Minimum learners</span><span className="font-medium text-ensena-ink">{minStudents}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Maximum learners</span><span className="font-medium text-ensena-ink">{maxStudents}</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Enrollment closes</span><span className="font-medium text-ensena-ink">{enrollmentDeadlineOptions.find((o) => o.type === enrollmentDeadlineType)?.label}</span></div>
            <div className="mt-1 flex justify-between border-t border-ensena-border pt-2"><span className="text-ensena-muted">Price</span><span className="font-medium text-ensena-ink">{formatNaira(pricePerSession)}/session</span></div>
            <div className="flex justify-between"><span className="text-ensena-muted">Scheduled value</span><span className="font-semibold text-ensena-ink">{formatNaira(scheduledValue)}</span></div>

            {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
            <p className="mt-1 text-xs text-ensena-muted">Your class will be reviewed by Enseña before it becomes visible to students.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-1 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="flex h-10 items-center gap-1 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
              <ChevronLeft className="size-4" /> Back
            </button>
          ) : <span />}
          {step < 5 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
              Next <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-60">
              {submitting ? "Submitting…" : "Submit for Approval"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
