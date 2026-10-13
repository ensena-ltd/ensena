"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MessageSquare, RefreshCcw, Star, User, Video, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ManageLessonSheet } from "@/components/shared/manage-lesson/manage-lesson-sheet";
import { CancelLessonModal } from "@/components/shared/manage-lesson/cancel-lesson-modal";
import { RescheduleLessonModal } from "@/components/shared/manage-lesson/reschedule-lesson-modal";
import { formatNaira } from "@/lib/format";
import { splitEarnings } from "@/lib/commission";
import { buildBookingReference } from "@/lib/booking-reference";
import type { ManageLessonAction, ManageLessonData } from "@/lib/manage-lesson-types";
import {
  defaultTutorDiscoverySettings,
  discoveryPaymentStatusStyles,
  discoverySessionStats,
  discoverySessionStatusStyles,
  type DiscoverySession,
} from "@/lib/discovery-sessions-data";
import { updateDiscoverySession } from "@/lib/discovery-sessions-store";
import { useAllDiscoverySessions } from "@/hooks/use-discovery-sessions";
import { useReviews } from "@/hooks/use-reviews";
import { cn } from "@/lib/utils";

const TUTOR_NAME = "Adaeze Okonkwo";
const tabs = ["Upcoming", "Completed", "Settings"] as const;
type Tab = (typeof tabs)[number];

export function TutorDiscoverySessionsClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Upcoming");
  const [settings, setSettings] = useState(defaultTutorDiscoverySettings);
  const [toast, setToast] = useState<string | null>(null);
  const sessions = useAllDiscoverySessions();
  const reviews = useReviews();
  const [manageId, setManageId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2200);
  }

  const mine = sessions.filter((d) => d.tutor === TUTOR_NAME);
  const upcoming = mine.filter((d) => d.status === "Upcoming");
  const completed = mine.filter((d) => d.status === "Completed" || d.status === "No Show");
  const split = splitEarnings(discoverySessionStats.revenue);

  const manageSession = sessions.find((d) => d.id === manageId) ?? null;
  const cancelingSession = sessions.find((d) => d.id === cancelingId) ?? null;
  const reschedulingSession = sessions.find((d) => d.id === reschedulingId) ?? null;

  function cancelSession(id: string) {
    updateDiscoverySession(id, { status: "Cancelled" });
    setCancelingId(null);
    setManageId(null);
    flash("Discovery Session cancelled.");
  }

  function rescheduleSession(id: string, newDate: string, newTime: string) {
    updateDiscoverySession(id, { date: newDate, time: newTime });
    setReschedulingId(null);
    setManageId(null);
    flash("Discovery Session rescheduled.");
  }

  function buildManageData(d: DiscoverySession): ManageLessonData {
    return {
      sheetTitle: "Manage discovery session",
      title: d.subject,
      subtitle: d.student,
      image: d.studentImage,
      statusLabel: d.status,
      bookingRef: buildBookingReference("discovery", d.id),
      infoRows: [
        { label: "Discovery date", value: d.date },
        { label: "Time", value: d.time },
        { label: "Duration", value: `${d.durationMins} minutes` },
        { label: "Price", value: "Free" },
        ...(d.conversionStatus && d.conversionStatus !== "Pending"
          ? [{ label: "Conversion status", value: d.conversionChannel ? `${d.conversionStatus} · ${d.conversionChannel}` : d.conversionStatus }]
          : []),
      ],
    };
  }

  function hasReviewedStudent(d: DiscoverySession): boolean {
    return reviews.some((r) => r.direction === "tutor-to-student" && r.bookingId === d.id && r.reviewerName === TUTOR_NAME && r.recipientName === d.student);
  }

  function buildManageActions(d: DiscoverySession): ManageLessonAction[] {
    const actions: ManageLessonAction[] = [];
    if (d.status === "Upcoming") {
      actions.push({ key: "join", label: "Enter classroom", icon: Video, variant: "primary", onClick: () => { setManageId(null); router.push(`/tutor-dashboard/classroom/discovery/${d.id}`); } });
      actions.push({ key: "calendar", label: "View on calendar", icon: Calendar, onClick: () => router.push("/tutor-dashboard/private-lessons?tab=Calendar") });
      actions.push({ key: "message", label: "Message student", icon: MessageSquare, onClick: () => { setManageId(null); router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(d.student)}`); } });
      actions.push({ key: "student", label: "View student", icon: User, onClick: () => { setManageId(null); router.push("/tutor-dashboard/students"); } });
      actions.push({ key: "reschedule", label: "Reschedule", icon: RefreshCcw, onClick: () => { setManageId(null); setReschedulingId(d.id); } });
      actions.push({ key: "cancel", label: "Cancel session", icon: XCircle, variant: "danger", onClick: () => { setManageId(null); setCancelingId(d.id); } });
      return actions;
    }
    if (d.status === "Completed" || d.status === "No Show") {
      if (!hasReviewedStudent(d)) {
        actions.push({ key: "review", label: "Rate & review student", icon: Star, variant: "primary", onClick: () => { setManageId(null); router.push(`/tutor-dashboard/discovery-sessions/${d.id}/recommend`); } });
      }
      actions.push({ key: "message", label: "Message student", icon: MessageSquare, onClick: () => { setManageId(null); router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(d.student)}`); } });
      return actions;
    }
    actions.push({ key: "message", label: "Message student", icon: MessageSquare, onClick: () => { setManageId(null); router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(d.student)}`); } });
    return actions;
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Discovery Sessions</h1>
        <p className="mt-1 text-sm text-ensena-muted">Short free intro sessions that help students decide if you&apos;re the right fit before booking lessons.</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-ink">{discoverySessionStats.total}</p><p className="text-[11px] text-ensena-muted">Total Sessions</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-ink">{discoverySessionStats.upcoming}</p><p className="text-[11px] text-ensena-muted">Upcoming</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-success">{discoverySessionStats.completed}</p><p className="text-[11px] text-ensena-muted">Completed</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-ink">{discoverySessionStats.conversionRatePct}%</p><p className="text-[11px] text-ensena-muted">Conversion Rate</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-ink">{formatNaira(split.net)}</p><p className="text-[11px] text-ensena-muted">Earnings</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-ink">{discoverySessionStats.avgRating}★</p><p className="text-[11px] text-ensena-muted">Average Rating</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-amber-600">{discoverySessionStats.noShows}</p><p className="text-[11px] text-ensena-muted">No Shows</p></div>
      </div>

      <div className="mt-5 flex gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full px-4 py-1.5 font-medium transition-colors", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Upcoming" && (
        <div className="mt-5 flex flex-col gap-3">
          {upcoming.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div className="relative size-11 shrink-0 overflow-hidden rounded-full"><Image src={d.studentImage} alt={d.student} fill sizes="44px" className="object-cover" /></div>
              <div className="min-w-[140px] flex-1">
                <p className="text-sm font-semibold text-ensena-ink">{d.student}</p>
                <p className="text-xs text-ensena-muted">{d.subject}</p>
              </div>
              <div className="flex items-center gap-x-3 text-xs text-ensena-muted">
                <span className="flex items-center gap-1"><Calendar className="size-3" /> {d.date}</span>
                <span className="flex items-center gap-1"><Clock className="size-3" /> {d.time} · {d.durationMins} mins</span>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", discoverySessionStatusStyles[d.status])}>{d.status}</span>
              <div className="flex items-center gap-1.5">
                <Button onClick={() => router.push(`/tutor-dashboard/classroom/discovery/${d.id}`)} className="h-8 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white"><Video className="size-3.5" /> Join Session</Button>
                <button type="button" onClick={() => setManageId(d.id)} className="rounded-full border border-ensena-border px-3 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Manage</button>
              </div>
            </div>
          ))}
          {upcoming.length === 0 && <p className="rounded-2xl border border-ensena-border bg-ensena-surface py-10 text-center text-sm text-ensena-muted">No upcoming discovery sessions.</p>}
        </div>
      )}

      {tab === "Completed" && (
        <div className="mt-5 flex flex-col gap-3">
          {completed.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div className="relative size-11 shrink-0 overflow-hidden rounded-full"><Image src={d.studentImage} alt={d.student} fill sizes="44px" className="object-cover" /></div>
              <div className="min-w-[140px] flex-1">
                <p className="text-sm font-semibold text-ensena-ink">{d.student}</p>
                <p className="text-xs text-ensena-muted">{d.subject} · {d.date}</p>
                {d.notes && <p className="mt-0.5 text-xs text-ensena-muted">{d.notes}</p>}
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", discoverySessionStatusStyles[d.status])}>{d.status}</span>
              {d.fitRating && <span className="text-xs text-ensena-muted">{d.fitRating}</span>}
              {d.paymentStatus && <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", discoveryPaymentStatusStyles[d.paymentStatus])}>Payment {d.paymentStatus}</span>}
              {d.conversionStatus && d.conversionStatus !== "Pending" && (
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", d.conversionStatus === "Continued" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                  {d.conversionChannel ? `${d.conversionStatus} · ${d.conversionChannel}` : d.conversionStatus}
                </span>
              )}
              {d.status === "Completed" && !hasReviewedStudent(d) && (
                <Button nativeButton={false} render={<Link href={`/tutor-dashboard/discovery-sessions/${d.id}/recommend`} />} className="h-8 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white">
                  Rate & Review Student
                </Button>
              )}
              <button type="button" onClick={() => setManageId(d.id)} className="rounded-full border border-ensena-border px-3 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Manage</button>
            </div>
          ))}
          {completed.length === 0 && <p className="rounded-2xl border border-ensena-border bg-ensena-surface py-10 text-center text-sm text-ensena-muted">No completed discovery sessions yet.</p>}
        </div>
      )}

      {tab === "Settings" && (
        <div className="mt-5 max-w-lg rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between rounded-xl border border-ensena-border p-3.5">
            <div>
              <p className="text-sm font-medium text-ensena-ink">Discovery Sessions</p>
              <p className="text-xs text-ensena-muted">Let new students book a short free intro session with you.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
              className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", settings.enabled ? "bg-ensena-primary" : "bg-ensena-border")}
            >
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", settings.enabled ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-ensena-bg-soft p-3 text-xs text-ensena-muted">
            Discovery Sessions are free for students. This is a platform-wide policy and isn&apos;t
            configurable per tutor. They&apos;re a great way to attract new students; you won&apos;t
            earn a fee for these sessions, but they often convert into paid lessons.
          </div>

          <div className="mt-4">
            <span className="text-xs font-medium text-ensena-muted">Duration</span>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-full bg-ensena-primary/10 px-3.5 py-1.5 text-xs font-semibold text-ensena-primary">25 minutes (max)</span>
              <span className="text-xs text-ensena-muted">Every Discovery Session is a maximum of 25 minutes. This is a platform-wide policy, not a per-tutor setting.</span>
            </div>
          </div>

          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Maximum sessions per day</span>
            <input
              type="number"
              min={1}
              value={settings.maxDailySessions}
              onChange={(e) => setSettings((s) => ({ ...s, maxDailySessions: Number(e.target.value) }))}
              className="h-10 w-40 rounded-lg border border-ensena-border px-3 text-sm"
            />
          </label>

          <Button onClick={() => flash("Discovery Session settings saved.")} className="mt-4 h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            Save Changes
          </Button>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}

      <ManageLessonSheet
        open={manageSession !== null}
        data={manageSession ? buildManageData(manageSession) : null}
        actions={manageSession ? buildManageActions(manageSession) : []}
        onClose={() => setManageId(null)}
      />

      <CancelLessonModal
        open={cancelingSession !== null}
        title="Cancel discovery session?"
        summary={cancelingSession ? `${cancelingSession.date} · ${cancelingSession.time}, ${cancelingSession.subject} with ${cancelingSession.student}` : ""}
        policyLabel="Discovery Sessions are free, so there's nothing to refund."
        refundAmount={0}
        cancellationFee={0}
        onKeep={() => setCancelingId(null)}
        onConfirm={() => cancelingId && cancelSession(cancelingId)}
      />

      <RescheduleLessonModal
        open={reschedulingSession !== null}
        currentDate={reschedulingSession?.date ?? ""}
        currentTime={reschedulingSession?.time ?? ""}
        onClose={() => setReschedulingId(null)}
        onConfirm={(newDate, newTime) => reschedulingId && rescheduleSession(reschedulingId, newDate, newTime)}
      />
    </div>
  );
}
