"use client";

import { useMemo, useState } from "react";
import { Calendar, FileText, Inbox, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAdminCommunications } from "@/hooks/use-admin-communications";
import { logAdminAction } from "@/lib/admin-audit-log";
import { initialTemplates, type AudienceType, type MessageChannel } from "@/lib/admin-communications-data";
import { cancelScheduledMessage, scheduleMessage, sendMessage } from "@/lib/admin-communications-store";
import { currentActorLabel } from "@/lib/admin-session";
import { platformUsers, type PlatformUser } from "@/lib/admin-users-data";
import { relativeTimeFromNow } from "@/lib/escrow-release";
import { cn } from "@/lib/utils";

const tabs = ["Compose", "Scheduled", "Sent", "Templates"] as const;
type Tab = (typeof tabs)[number];

const audienceTypes: AudienceType[] = ["All Students", "All Tutors", "By State", "By Status", "Selected Users"];

function studentsAndTutors(): PlatformUser[] {
  return platformUsers.filter((u) => u.role === "Student" || u.role === "Tutor");
}

export function AdminCommunicationsClient() {
  const [tab, setTab] = useState<Tab>("Compose");
  const { sent, scheduled } = useAdminCommunications();

  // Compose state
  const [audienceType, setAudienceType] = useState<AudienceType>("All Students");
  const [stateValue, setStateValue] = useState(() => studentsAndTutors()[0]?.state ?? "");
  const [statusValue, setStatusValue] = useState<"Active" | "Restricted" | "Banned">("Active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailOn, setEmailOn] = useState(true);
  const [inAppOn, setInAppOn] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  const allUsers = studentsAndTutors();
  const states = Array.from(new Set(allUsers.map((u) => u.state)));

  const recipients = useMemo(() => {
    if (audienceType === "All Students") return allUsers.filter((u) => u.role === "Student");
    if (audienceType === "All Tutors") return allUsers.filter((u) => u.role === "Tutor");
    if (audienceType === "By State") return allUsers.filter((u) => u.state === stateValue);
    if (audienceType === "By Status") return allUsers.filter((u) => (statusValue === "Restricted" ? u.status === "Suspended" : u.status === statusValue));
    return allUsers.filter((u) => selectedIds.has(u.id));
  }, [audienceType, stateValue, statusValue, selectedIds, allUsers]);

  const audienceLabel =
    audienceType === "All Students" ? "All Students"
    : audienceType === "All Tutors" ? "All Tutors"
    : audienceType === "By State" ? `${stateValue} users`
    : audienceType === "By Status" ? `${statusValue} users`
    : "Selected users";

  const channels: MessageChannel[] = [...(emailOn ? (["Email"] as const) : []), ...(inAppOn ? (["In-App"] as const) : [])];
  const canSend = subject.trim() && body.trim() && recipients.length > 0 && channels.length > 0;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function resetCompose() {
    setSubject(""); setBody(""); setSelectedIds(new Set());
  }

  function confirmSend() {
    sendMessage({ sentBy: currentActorLabel(), audienceLabel, recipientCount: recipients.length, channels, subject: subject.trim(), body: body.trim() });
    logAdminAction("Sent bulk message", currentActorLabel(), `${audienceLabel} · ${recipients.length} recipients`);
    setConfirmOpen(false);
    flash(`Message sent to ${recipients.length} ${recipients.length === 1 ? "user" : "users"}.`);
    resetCompose();
  }

  function confirmSchedule() {
    if (!scheduleDate) return;
    const ms = new Date(scheduleDate).getTime();
    scheduleMessage({
      scheduledForMs: ms,
      scheduledForLabel: new Date(scheduleDate).toLocaleString(),
      sentBy: currentActorLabel(),
      audienceLabel,
      recipientCount: recipients.length,
      channels,
      subject: subject.trim(),
      body: body.trim(),
    });
    setScheduleOpen(false);
    flash("Message scheduled.");
    resetCompose();
  }

  function applyTemplate(id: string) {
    const t = initialTemplates.find((t) => t.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
    setTab("Compose");
    flash(`Loaded "${t.name}" into Compose.`);
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Communications</h1>
        <p className="mt-1 text-sm text-ensena-muted">Send messages to individuals or groups. Recipients are selected by Ensena, so staff never need to see or copy raw contact lists.</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 rounded-full border border-ensena-border bg-ensena-surface p-1 text-sm w-fit">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 font-medium", tab === t ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:text-ensena-ink")}>{t}</button>
        ))}
      </div>

      {tab === "Compose" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">New Message</h2>

            <p className="mt-3 text-xs font-medium text-ensena-muted">Send to</p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {audienceTypes.map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm text-ensena-ink">
                  <input type="radio" name="audience" checked={audienceType === a} onChange={() => setAudienceType(a)} /> {a}
                </label>
              ))}
            </div>

            {audienceType === "By State" && (
              <select value={stateValue} onChange={(e) => setStateValue(e.target.value)} className="mt-2 h-9 rounded-full border border-ensena-border px-3 text-sm">
                {states.map((s) => <option key={s}>{s}</option>)}
              </select>
            )}
            {audienceType === "By Status" && (
              <select value={statusValue} onChange={(e) => setStatusValue(e.target.value as typeof statusValue)} className="mt-2 h-9 rounded-full border border-ensena-border px-3 text-sm">
                <option>Active</option>
                <option>Restricted</option>
                <option>Banned</option>
              </select>
            )}
            {audienceType === "Selected Users" && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-ensena-border p-2">
                {allUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-ensena-bg-soft">
                    <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelected(u.id)} /> {u.name} <span className="text-xs text-ensena-muted">({u.role})</span>
                  </label>
                ))}
              </div>
            )}

            <p className="mt-3 rounded-xl bg-ensena-primary/5 px-3 py-2 text-sm font-semibold text-ensena-primary">Estimated recipients: {recipients.length}</p>

            <p className="mt-3 text-xs font-medium text-ensena-muted">Channel</p>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-sm text-ensena-ink"><input type="checkbox" checked={emailOn} onChange={(e) => setEmailOn(e.target.checked)} /> Email</label>
              <label className="flex items-center gap-1.5 text-sm text-ensena-ink"><input type="checkbox" checked={inAppOn} onChange={(e) => setInAppOn(e.target.checked)} /> In-App Notification</label>
              <label className="flex items-center gap-1.5 text-sm text-ensena-muted"><input type="checkbox" disabled /> SMS <span className="text-xs">(coming soon)</span></label>
            </div>

            <label className="mt-3 flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="mt-2 flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Message</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={!canSend} onClick={() => setConfirmOpen(true)} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-40">Send</Button>
              <Button variant="outline" disabled={!canSend} onClick={() => setScheduleOpen(true)} className="h-10 rounded-full border-ensena-border px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40">Schedule for Later</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Preview</h2>
            <div className="mt-2 rounded-xl bg-ensena-bg-soft p-3">
              <p className="text-xs font-semibold text-ensena-ink">{subject || "(no subject yet)"}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-ensena-muted">{body || "(no message yet)"}</p>
            </div>
            <p className="mt-3 text-xs text-ensena-muted">Audience: {audienceLabel}</p>
            <p className="text-xs text-ensena-muted">Channel: {channels.join(" + ") || "None selected"}</p>
          </div>
        </div>
      )}

      {tab === "Scheduled" && (
        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          {scheduled.length === 0 ? (
            <p className="flex items-center gap-1.5 py-6 text-center text-sm text-ensena-muted"><Calendar className="size-4" /> No scheduled messages.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-ensena-border">
              {scheduled.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ensena-ink">{m.subject}</p>
                    <p className="text-xs text-ensena-muted">{m.audienceLabel} · {m.recipientCount} recipients · {m.channels.join(" + ")}</p>
                    <p className="text-xs text-ensena-muted">Scheduled for {m.scheduledForLabel}</p>
                  </div>
                  <button type="button" onClick={() => cancelScheduledMessage(m.id)} className="shrink-0 rounded-full border border-ensena-border px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">Cancel</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "Sent" && (
        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><Inbox className="size-3.5" /> Recorded in the Admin Audit Log too.</p>
          <ul className="mt-2 flex flex-col divide-y divide-ensena-border">
            {sent.map((m) => (
              <li key={m.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ensena-ink">{m.subject}</p>
                  <span className="shrink-0 text-xs text-ensena-muted">{relativeTimeFromNow(m.atMs)}</span>
                </div>
                <p className="text-xs text-ensena-muted">Sent by: {m.sentBy} · Audience: {m.recipientCount} {m.recipientCount === 1 ? "recipient" : "recipients"} ({m.audienceLabel}) · Channel: {m.channels.join(" + ")}</p>
              </li>
            ))}
            {sent.length === 0 && <p className="py-6 text-center text-sm text-ensena-muted">Nothing sent yet.</p>}
          </ul>
        </div>
      )}

      {tab === "Templates" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {initialTemplates.map((t) => (
            <div key={t.id} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink"><FileText className="size-4 text-ensena-primary" /> {t.name}</p>
                <span className="shrink-0 rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[11px] font-medium text-ensena-muted">{t.category}</span>
              </div>
              <p className="mt-2 text-xs font-medium text-ensena-ink">{t.subject}</p>
              <p className="mt-1 text-xs text-ensena-muted">{t.body}</p>
              <button type="button" onClick={() => applyTemplate(t.id)} className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline"><Send className="size-3" /> Use Template</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm & Send">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-ink">You&apos;re about to send this message to:</p>
          <p className="rounded-xl bg-ensena-bg-soft p-3 text-sm font-semibold text-ensena-ink">{recipients.length} {recipients.length === 1 ? "user" : "users"} ({audienceLabel})</p>
          <p className="text-sm text-ensena-muted">Channel: {channels.join(" + ")}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={confirmSend} className="h-10 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">Confirm &amp; Send</Button>
          </div>
        </div>
      </Modal>

      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="Schedule Message">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Send at</span>
            <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <Button disabled={!scheduleDate} onClick={confirmSchedule} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-40">Schedule</Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
