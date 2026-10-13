"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Clock,
  Eye,
  GraduationCap,
  Info,
  MoreVertical,
  Plus,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAvailability, useBlockedDates, useSessionSettings, useSpecialDates } from "@/hooks/use-counsellor-availability";
import type { AvailabilityDay } from "@/lib/admin-counselling-center-data";
import {
  academicLevelSupportOptions,
  counsellor,
  counsellorTimezone,
  supportAreaOptions,
} from "@/lib/counsellor-data";
import {
  addBlockedDate as addBlockedDateToStore,
  addSpecialDate as addSpecialDateToStore,
  removeBlockedDate as removeBlockedDateFromStore,
  removeSpecialDate as removeSpecialDateFromStore,
  updateAvailabilityDay,
  updateSessionSettings,
} from "@/lib/counsellor-availability-store";
import { cn } from "@/lib/utils";

const settingsTabs = ["Profile", "Availability", "Session Settings"] as const;
type SettingsTab = (typeof settingsTabs)[number];

// Half-hour options in the same 12h display format the availability data
// is already stored in (e.g. "4:00 PM") — no conversion needed either way.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  let hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const meridiem = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${meridiem}`;
});

const durationOptions = [15, 30, 45, 60];
const noticeOptions = [1, 2, 4, 24];
const maxSessionOptions = [2, 4, 6, 8, 10];

function Card({ title, icon: Icon, children, className }: { title: string; icon?: typeof Video; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-ensena-border bg-ensena-surface p-5", className)}>
      <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
        {Icon && <Icon className="size-4 text-ensena-primary" />} {title}
      </h2>
      {children}
    </div>
  );
}

export function CounsellorSettingsTab() {
  const [activeSection, setActiveSection] = useState<SettingsTab>("Profile");
  const [toast, setToast] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const availabilityRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<HTMLDivElement>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast((cur) => (cur === m ? null : cur)), 2500);
  }

  function goTo(section: SettingsTab) {
    setActiveSection(section);
    const ref = section === "Profile" ? profileRef : section === "Availability" ? availabilityRef : sessionRef;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------------- Profile ----------------
  const [displayName, setDisplayName] = useState(counsellor.name);
  const [role, setRole] = useState(counsellor.role);
  const [bio, setBio] = useState(counsellor.bio);
  const [supportAreas, setSupportAreas] = useState<string[]>(counsellor.supportAreas);
  const [addAreaValue, setAddAreaValue] = useState("");
  const [academicLevels, setAcademicLevels] = useState<string[]>(counsellor.academicLevelsSupported);
  const [allLevels, setAllLevels] = useState(counsellor.allLevels);

  function removeArea(area: string) {
    setSupportAreas((prev) => prev.filter((a) => a !== area));
  }
  function addArea(area: string) {
    if (!area || supportAreas.includes(area)) return;
    setSupportAreas((prev) => [...prev, area]);
    setAddAreaValue("");
  }
  function toggleLevel(level: string) {
    setAcademicLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  }

  // ---------------- Availability ----------------
  const availability = useAvailability();
  const blockedDates = useBlockedDates();
  const specialDates = useSpecialDates();

  function updateDay(day: string, patch: Partial<AvailabilityDay>) {
    updateAvailabilityDay(day, patch);
  }

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  function addBlockedDate() {
    if (!blockDate) return;
    const label = new Date(`${blockDate}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", weekday: "long" });
    addBlockedDateToStore({ date: blockDate, reason: blockReason.trim() || "Unavailable", allDay: true });
    flash(`${label} blocked.`);
    setBlockModalOpen(false);
    setBlockDate("");
    setBlockReason("");
  }
  function removeBlockedDate(date: string) {
    removeBlockedDateFromStore(date);
  }

  const [specialModalOpen, setSpecialModalOpen] = useState(false);
  const [specialDate, setSpecialDate] = useState("");
  const [specialStart, setSpecialStart] = useState("10:00 AM");
  const [specialEnd, setSpecialEnd] = useState("1:00 PM");
  function addSpecialAvailability() {
    if (!specialDate) return;
    addSpecialDateToStore({ date: specialDate, start: specialStart, end: specialEnd });
    flash("Special availability added.");
    setSpecialModalOpen(false);
    setSpecialDate("");
  }
  function removeSpecialAvailability(date: string) {
    removeSpecialDateFromStore(date);
  }

  function dateLabel(iso: string): string {
    return new Date(`${iso}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", weekday: "long" });
  }

  // ---------------- Session Settings ----------------
  const sessionSettings = useSessionSettings();
  const { durationMinutes: duration, minimumBookingNoticeHours: minimumNotice, maxSessionsPerDay: maxPerDay, allowBackToBack } = sessionSettings;
  function setDuration(value: number) {
    updateSessionSettings({ durationMinutes: value });
  }
  function setMinimumNotice(value: number) {
    updateSessionSettings({ minimumBookingNoticeHours: value });
  }
  function setMaxPerDay(value: number) {
    updateSessionSettings({ maxSessionsPerDay: value });
  }
  function setAllowBackToBack(value: boolean) {
    updateSessionSettings({ allowBackToBack: value });
  }

  const levelsPreview = allLevels ? "All Levels" : academicLevels.join(", ") || "Not specified";

  return (
    <div>
      <div className="mt-5 flex flex-wrap gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm">
        {settingsTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => goTo(t)}
            className={cn("shrink-0 rounded-full px-4 py-1.5 font-medium transition-colors", activeSection === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Profile */}
            <div ref={profileRef} className="scroll-mt-24 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Counsellor Profile</h2>
              <p className="mt-1 text-xs text-ensena-muted">This information is visible to students when they book a session with you.</p>

              <div className="mt-4 flex items-center gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-full"><Image src={counsellor.image} alt={displayName} fill sizes="80px" className="object-cover" /></div>
                <div>
                  <Button variant="outline" onClick={() => flash("In a live deployment, this would update Benny's photo everywhere she appears.")} className="h-9 rounded-full border-ensena-border text-xs font-medium">
                    <Upload className="size-3.5" /> Change Photo
                  </Button>
                  <p className="mt-1.5 text-[11px] text-ensena-muted">JPG, PNG or WEBP. Max 2MB</p>
                </div>
              </div>

              <label className="mt-4 flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ensena-muted">Display Name</span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>

              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ensena-muted">Role / Title</span>
                <input value={role} onChange={(e) => setRole(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>

              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ensena-muted">Short Bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => e.target.value.length <= 300 && setBio(e.target.value)}
                  rows={4}
                  className="rounded-lg border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary"
                />
                <span className="self-end text-[11px] text-ensena-muted">{bio.length}/300</span>
              </label>

              <div className="mt-3">
                <p className="text-xs font-medium text-ensena-muted">Areas of Academic Support</p>
                <p className="text-[11px] text-ensena-muted">Select the areas where you provide guidance.</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {supportAreas.map((area) => (
                    <span key={area} className="flex items-center gap-1 rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">
                      {area}
                      <button type="button" onClick={() => removeArea(area)} aria-label={`Remove ${area}`}><X className="size-3" /></button>
                    </span>
                  ))}
                </div>
                {supportAreaOptions.some((o) => !supportAreas.includes(o)) && (
                  <select
                    value={addAreaValue}
                    onChange={(e) => addArea(e.target.value)}
                    className="mt-2 h-9 rounded-lg border border-ensena-border px-2 text-xs text-ensena-muted"
                  >
                    <option value="">+ Add support area</option>
                    {supportAreaOptions.filter((o) => !supportAreas.includes(o)).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium text-ensena-muted">Academic Levels Supported</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {academicLevelSupportOptions.map((level) => (
                    <label key={level} className="flex items-center gap-2 text-sm text-ensena-ink">
                      <input type="checkbox" checked={academicLevels.includes(level)} onChange={() => toggleLevel(level)} className="size-4 rounded border-ensena-border" />
                      {level}
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm font-medium text-ensena-ink">
                    <input type="checkbox" checked={allLevels} onChange={(e) => setAllLevels(e.target.checked)} className="size-4 rounded border-ensena-border" />
                    All Levels
                  </label>
                </div>
              </div>

              <Button onClick={() => flash("Profile changes saved.")} className="mt-4 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover sm:w-auto">
                Save Changes
              </Button>
            </div>

            {/* Availability + Blocked + Special */}
            <div className="flex flex-col gap-4">
              <div ref={availabilityRef} className="scroll-mt-24 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-ensena-ink">Availability</h2>
                    <p className="mt-1 text-xs text-ensena-muted">Set when students can book sessions with you.</p>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-ensena-muted">Timezone</span>
                    <select defaultValue={counsellorTimezone} className="h-9 rounded-lg border border-ensena-border px-2 text-xs text-ensena-ink">
                      <option>{counsellorTimezone}</option>
                    </select>
                  </label>
                </div>

                <div className="mt-3 flex flex-col divide-y divide-ensena-border">
                  {availability.map((d) => (
                    <div key={d.day} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                      <span className="w-24 shrink-0 font-medium text-ensena-ink">{d.day}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={d.enabled}
                        onClick={() => updateDay(d.day, { enabled: !d.enabled })}
                        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", d.enabled ? "bg-ensena-success" : "bg-ensena-border")}
                      >
                        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", d.enabled ? "translate-x-[22px]" : "translate-x-0.5")} />
                      </button>
                      {d.enabled ? (
                        <div className="flex flex-1 flex-wrap items-center gap-1.5 text-xs">
                          <select value={d.start} onChange={(e) => updateDay(d.day, { start: e.target.value })} className="h-8 rounded-lg border border-ensena-border px-1.5">
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="text-ensena-muted">–</span>
                          <select value={d.end} onChange={(e) => updateDay(d.day, { end: e.target.value })} className="h-8 rounded-lg border border-ensena-border px-1.5">
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      ) : (
                        <span className="flex-1 text-xs text-ensena-muted">Unavailable</span>
                      )}
                      <button type="button" onClick={() => flash(`Use the dropdowns to adjust ${d.day}'s hours directly.`)} className="shrink-0 rounded-full border border-ensena-border px-3 py-1 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <Card title="Blocked Dates">
                <p className="text-xs text-ensena-muted">You will not be available on these dates.</p>
                <Button variant="outline" onClick={() => setBlockModalOpen(true)} className="mt-3 h-9 w-full rounded-full border-ensena-border text-xs font-semibold text-ensena-primary">
                  <Plus className="size-3.5" /> Add Blocked Date
                </Button>
                <ul className="mt-3 flex flex-col gap-2">
                  {blockedDates.map((b) => (
                    <li key={b.date} className="flex items-center justify-between gap-2 rounded-xl border border-ensena-border p-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ensena-ink">{dateLabel(b.date)}</p>
                        <p className="text-xs text-ensena-muted">{b.reason}</p>
                      </div>
                      <button type="button" onClick={() => removeBlockedDate(b.date)} aria-label="Remove blocked date" className="shrink-0 text-ensena-muted hover:text-rose-600"><MoreVertical className="size-4" /></button>
                    </li>
                  ))}
                  {blockedDates.length === 0 && <li className="text-xs text-ensena-muted">No blocked dates.</li>}
                </ul>
              </Card>

              <Card title="Special Availability">
                <p className="text-xs text-ensena-muted">Add specific dates with different availability.</p>
                <Button variant="outline" onClick={() => setSpecialModalOpen(true)} className="mt-3 h-9 w-full rounded-full border-ensena-border text-xs font-semibold text-ensena-primary">
                  <Plus className="size-3.5" /> Add Special Availability
                </Button>
                <ul className="mt-3 flex flex-col gap-2">
                  {specialDates.map((s) => (
                    <li key={s.date} className="flex items-center justify-between gap-2 rounded-xl border border-ensena-border p-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ensena-ink">{dateLabel(s.date)}</p>
                        <p className="text-xs text-ensena-muted">{s.start} – {s.end}</p>
                      </div>
                      <button type="button" onClick={() => removeSpecialAvailability(s.date)} aria-label="Remove special availability" className="shrink-0 text-ensena-muted hover:text-rose-600"><MoreVertical className="size-4" /></button>
                    </li>
                  ))}
                  {specialDates.length === 0 && <li className="text-xs text-ensena-muted">No special availability added.</li>}
                </ul>
              </Card>
            </div>
          </div>

          {/* Session Settings */}
          <div ref={sessionRef} className="scroll-mt-24 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Session Settings</h2>
            <p className="mt-1 text-xs text-ensena-muted">Configure how your counselling sessions work.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ensena-muted">Session Type</span>
                <select defaultValue="Video Call" className="h-10 rounded-lg border border-ensena-border px-2 text-sm">
                  <option>Video Call</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ensena-muted">Session Duration</span>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-2 text-sm">
                  {durationOptions.map((m) => <option key={m} value={m}>{m} minutes</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ensena-muted">Cost to Student</span>
                <input value="Free" disabled className="h-10 rounded-lg border border-ensena-border bg-ensena-bg-soft px-3 text-sm text-ensena-muted" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ensena-muted">Minimum Booking Notice</span>
                <select value={minimumNotice} onChange={(e) => setMinimumNotice(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-2 text-sm">
                  {noticeOptions.map((h) => <option key={h} value={h}>{h} hour{h === 1 ? "" : "s"} before session</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ensena-muted">Maximum Sessions Per Day</span>
                <select value={maxPerDay} onChange={(e) => setMaxPerDay(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-2 text-sm">
                  {maxSessionOptions.map((n) => <option key={n} value={n}>{n} sessions</option>)}
                </select>
              </label>
            </div>

            <label className="mt-4 flex items-start gap-2 text-sm text-ensena-ink">
              <input type="checkbox" checked={allowBackToBack} onChange={(e) => setAllowBackToBack(e.target.checked)} className="mt-0.5 size-4 rounded border-ensena-border" />
              <span>
                Allow back-to-back sessions
                <span className="block text-xs text-ensena-muted">Enable if you want to allow sessions to be booked without a gap.</span>
              </span>
            </label>

            <div className="mt-4 flex justify-end">
              <Button onClick={() => flash("Session settings saved.")} className="h-10 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-ensena-primary-hover">
                Save Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Student Preview */}
        <div className="lg:sticky lg:top-6">
          <Card title="Student Preview" icon={Eye}>
            <p className="text-xs text-ensena-muted">This is how students will see your profile when booking a session.</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-full"><Image src={counsellor.image} alt={displayName} fill sizes="56px" className="object-cover" /></div>
              <div>
                <p className="font-heading text-base font-semibold text-ensena-ink">{displayName}</p>
                <p className="text-xs text-ensena-muted">{role}</p>
                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Free Session</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Video className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
                <div><p className="font-medium text-ensena-ink">Video Call</p><p className="text-xs text-ensena-muted">{duration} minutes</p></div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
                <div><p className="font-medium text-ensena-ink">Available</p><p className="text-xs text-ensena-muted">See available times</p></div>
              </div>
              <div className="flex items-start gap-2">
                <GraduationCap className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
                <div><p className="font-medium text-ensena-ink">Levels</p><p className="text-xs text-ensena-muted">{levelsPreview}</p></div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
                <div>
                  <p className="font-medium text-ensena-ink">Support Areas</p>
                  <p className="text-xs text-ensena-muted">{supportAreas.slice(0, 3).join(", ")}{supportAreas.length > 3 ? " and more" : ""}</p>
                </div>
              </div>
            </div>

            <p className="mt-4 border-t border-ensena-border pt-3 text-xs leading-relaxed text-ensena-muted">{bio}</p>
          </Card>
        </div>
      </div>

      <Modal open={blockModalOpen} onClose={() => setBlockModalOpen(false)} title="Add Blocked Date">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Date</span>
            <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason (optional)</span>
            <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="e.g. Personal leave" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <div className="mt-1 flex items-start gap-2 rounded-lg bg-ensena-bg-soft p-2.5 text-xs text-ensena-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" /> Students won&apos;t be able to book any session on this date, regardless of your normal weekly hours.
          </div>
          <Button disabled={!blockDate} onClick={addBlockedDate} className="mt-1 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-40">
            Block Date
          </Button>
        </div>
      </Modal>

      <Modal open={specialModalOpen} onClose={() => setSpecialModalOpen(false)} title="Add Special Availability">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Date</span>
            <input type="date" value={specialDate} onChange={(e) => setSpecialDate(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Start</span>
              <select value={specialStart} onChange={(e) => setSpecialStart(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2 text-sm">
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">End</span>
              <select value={specialEnd} onChange={(e) => setSpecialEnd(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2 text-sm">
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <p className="text-xs text-ensena-muted">This overrides your normal weekly hours for this one date only.</p>
          <Button disabled={!specialDate} onClick={addSpecialAvailability} className="mt-1 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-40">
            Add Special Availability
          </Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
