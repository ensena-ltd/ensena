"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calendar, Clock, FileText, MessageSquare, RefreshCcw, Star, User, Video, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiveTutorRating } from "@/components/shared/live-tutor-rating";
import { ManageLessonSheet } from "@/components/shared/manage-lesson/manage-lesson-sheet";
import { CancelLessonModal } from "@/components/shared/manage-lesson/cancel-lesson-modal";
import { RescheduleLessonModal } from "@/components/shared/manage-lesson/reschedule-lesson-modal";
import { formatNaira } from "@/lib/format";
import { buildBookingReference } from "@/lib/booking-reference";
import { useAllDiscoverySessions } from "@/hooks/use-discovery-sessions";
import type { ManageLessonAction, ManageLessonData } from "@/lib/manage-lesson-types";
import {
  discoveryPaymentStatusStyles,
  discoverySessionStatusStyles,
  recommendedTutors,
  type DiscoverySession,
} from "@/lib/discovery-sessions-data";
import { cn } from "@/lib/utils";

// The discovery-sessions module's own established student identity — see
// the matching constant/comment in my-lessons-client.tsx. Not the same as
// dashboardStudent.name; a pre-existing, deliberately-accepted seam.
const DISCOVERY_STUDENT_NAME = "Sarah Johnson";

const tabs = ["Upcoming", "Completed", "Cancelled", "Recommended Tutors"] as const;
type Tab = (typeof tabs)[number];

function startsInLabel(date: string): string {
  if (date === "Today") return "Starts today";
  if (date === "Tomorrow") return "Starts tomorrow";
  return `Starts ${date}`;
}

export function StudentDiscoverySessionsClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Upcoming");
  const [toast, setToast] = useState<string | null>(null);
  const liveSessions = useAllDiscoverySessions();
  // Cancel/reschedule stay local-only overrides layered on the live seed +
  // runtime-booked list — same scope boundary as the rest of this pass:
  // these actions don't yet write to a shared cross-role store.
  const [overrides, setOverrides] = useState<Record<string, Partial<DiscoverySession>>>({});
  const sessions = liveSessions.map((d) => (overrides[d.id] ? { ...d, ...overrides[d.id] } : d));
  const [manageId, setManageId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2200);
  }

  const mine = sessions.filter((d) => d.student === DISCOVERY_STUDENT_NAME);
  const upcoming = mine.filter((d) => d.status === "Upcoming");
  const completed = mine.filter((d) => d.status === "Completed" || d.status === "No Show");
  const cancelled = mine.filter((d) => d.status === "Cancelled");

  const manageSession = sessions.find((d) => d.id === manageId) ?? null;
  const cancelingSession = sessions.find((d) => d.id === cancelingId) ?? null;
  const reschedulingSession = sessions.find((d) => d.id === reschedulingId) ?? null;

  function cancelSession(id: string) {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], status: "Cancelled" } }));
    setCancelingId(null);
    setManageId(null);
    flash("Discovery Session cancelled.");
  }

  function rescheduleSession(id: string, newDate: string, newTime: string) {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], date: newDate, time: newTime } }));
    setReschedulingId(null);
    setManageId(null);
    flash("Discovery Session rescheduled.");
  }

  function buildManageData(d: DiscoverySession): ManageLessonData {
    return {
      sheetTitle: "Manage discovery session",
      title: d.subject,
      subtitle: d.tutor,
      image: d.tutorImage,
      statusLabel: d.status,
      bookingRef: buildBookingReference("discovery", d.id),
      infoRows: [
        { label: "Discovery date", value: d.date },
        { label: "Time", value: d.time },
        { label: "Duration", value: `${d.durationMins} minutes` },
        { label: "Price", value: "Free" },
      ],
    };
  }

  function buildManageActions(d: DiscoverySession): ManageLessonAction[] {
    const actions: ManageLessonAction[] = [];

    if (d.status === "Upcoming") {
      actions.push({
        key: "join",
        label: "Join discovery session",
        icon: Video,
        variant: "primary",
        disabled: d.date !== "Today",
        onClick: () => { setManageId(null); router.push(`/student-dashboard/discovery-sessions/${d.id}/classroom`); },
      });
      actions.push({ key: "calendar", label: "View on calendar", icon: Calendar, onClick: () => router.push("/student-dashboard/lessons?tab=Study%20Planner") });
      actions.push({ key: "message", label: "Message tutor", icon: MessageSquare, onClick: () => { setManageId(null); router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(d.tutor)}`); } });
      actions.push({ key: "reschedule", label: "Reschedule", icon: RefreshCcw, onClick: () => { setManageId(null); setReschedulingId(d.id); } });
      actions.push({ key: "cancel", label: "Cancel discovery session", icon: XCircle, variant: "danger", onClick: () => { setManageId(null); setCancelingId(d.id); } });
      return actions;
    }

    if (d.status === "Completed" || d.status === "No Show") {
      if (!d.fitRating) {
        actions.push({ key: "followup", label: "View follow-up", icon: FileText, variant: "primary", onClick: () => { setManageId(null); router.push(`/student-dashboard/discovery-sessions/${d.id}/follow-up`); } });
      } else {
        actions.push({ key: "followup", label: "View follow-up", icon: FileText, onClick: () => { setManageId(null); router.push(`/student-dashboard/discovery-sessions/${d.id}/follow-up`); } });
        actions.push({ key: "continue", label: "Continue with this tutor", icon: User, variant: "primary", onClick: () => { setManageId(null); router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(d.tutor)}`); } });
      }
      actions.push({ key: "message", label: "Message tutor", icon: MessageSquare, onClick: () => { setManageId(null); router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(d.tutor)}`); } });
      return actions;
    }

    actions.push({ key: "message", label: "Message tutor", icon: MessageSquare, onClick: () => { setManageId(null); router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(d.tutor)}`); } });
    return actions;
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Discovery Sessions</h1>
        <p className="mt-1 text-sm text-ensena-muted">Short free intro sessions to help you find the right tutor before committing to lessons.</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 rounded-full px-4 py-1.5 font-medium transition-colors", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Upcoming" && (
        <div className="mt-5 flex flex-col gap-3">
          {upcoming.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div className="relative size-11 shrink-0 overflow-hidden rounded-full"><Image src={d.tutorImage} alt={d.tutor} fill sizes="44px" className="object-cover" /></div>
              <div className="min-w-[140px] flex-1">
                <p className="text-sm font-semibold text-ensena-ink">{d.tutor}</p>
                <p className="text-xs text-ensena-muted">{d.subject}</p>
              </div>
              <div className="flex items-center gap-x-3 text-xs text-ensena-muted">
                <span className="flex items-center gap-1"><Calendar className="size-3" /> {d.date}</span>
                <span className="flex items-center gap-1"><Clock className="size-3" /> {d.time} · {d.durationMins} mins</span>
                <span className="font-medium text-ensena-ink">{formatNaira(d.price)}</span>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", discoverySessionStatusStyles[d.status])}>{d.status}</span>
              {d.paymentStatus && <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", discoveryPaymentStatusStyles[d.paymentStatus])}>{d.paymentStatus}</span>}
              {d.date !== "Today" && <span className="text-xs font-medium text-ensena-muted">{startsInLabel(d.date)}</span>}
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => router.push(`/student-dashboard/discovery-sessions/${d.id}/classroom`)}
                  disabled={d.date !== "Today"}
                  className="h-8 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white"
                >
                  <Video className="size-3.5" /> Join Session
                </Button>
                <button type="button" onClick={() => setManageId(d.id)} className="rounded-full border border-ensena-border px-3 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Manage</button>
              </div>
            </div>
          ))}
          {upcoming.length === 0 && <p className="rounded-2xl border border-ensena-border bg-ensena-surface py-10 text-center text-sm text-ensena-muted">No upcoming discovery sessions.</p>}
        </div>
      )}

      {tab === "Completed" && (
        <div className="mt-5 flex flex-col gap-3">
          {completed.map((d) => {
            return (
              <div key={d.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-full"><Image src={d.tutorImage} alt={d.tutor} fill sizes="44px" className="object-cover" /></div>
                <div className="min-w-[140px] flex-1">
                  <p className="text-sm font-semibold text-ensena-ink">{d.tutor}</p>
                  <p className="text-xs text-ensena-muted">{d.subject} · {d.date}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", discoverySessionStatusStyles[d.status])}>{d.status}</span>
                {d.paymentStatus && <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", discoveryPaymentStatusStyles[d.paymentStatus])}>{d.paymentStatus}</span>}
                {d.fitRating ? (
                  <span className="text-xs text-ensena-muted">
                    Your rating: {d.fitRating}
                    {d.conversionStatus && d.conversionStatus !== "Pending"
                      ? ` · ${d.conversionChannel ? `${d.conversionStatus} · ${d.conversionChannel}` : d.conversionStatus}`
                      : ""}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push(`/student-dashboard/discovery-sessions/${d.id}/follow-up`)}
                    className="rounded-full bg-ensena-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
                  >
                    Continue Your Journey
                  </button>
                )}
                <button type="button" onClick={() => setManageId(d.id)} className="rounded-full border border-ensena-border px-3 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Manage</button>
              </div>
            );
          })}
          {completed.length === 0 && <p className="rounded-2xl border border-ensena-border bg-ensena-surface py-10 text-center text-sm text-ensena-muted">No completed discovery sessions yet.</p>}
        </div>
      )}

      {tab === "Cancelled" && (
        <div className="mt-5 flex flex-col gap-3">
          {cancelled.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div className="relative size-11 shrink-0 overflow-hidden rounded-full"><Image src={d.tutorImage} alt={d.tutor} fill sizes="44px" className="object-cover" /></div>
              <div className="min-w-[140px] flex-1">
                <p className="text-sm font-semibold text-ensena-ink">{d.tutor}</p>
                <p className="text-xs text-ensena-muted">{d.subject} · {d.date}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", discoverySessionStatusStyles[d.status])}>{d.status}</span>
              <button type="button" onClick={() => setManageId(d.id)} className="rounded-full border border-ensena-border px-3 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Manage</button>
            </div>
          ))}
          {cancelled.length === 0 && <p className="rounded-2xl border border-ensena-border bg-ensena-surface py-10 text-center text-sm text-ensena-muted">No cancelled discovery sessions.</p>}
        </div>
      )}

      {tab === "Recommended Tutors" && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {recommendedTutors.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full"><Image src={t.image} alt={t.name} fill sizes="48px" className="object-cover" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ensena-ink">{t.name}</p>
                <p className="truncate text-xs text-ensena-muted">{t.subject}</p>
                <p className="flex items-center gap-1 text-xs text-ensena-muted">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  <LiveTutorRating name={t.name} rating={t.rating} reviews={0}>{(live) => live.rating}</LiveTutorRating>
                  · {formatNaira(t.price)} / {t.durationMins} mins
                </p>
              </div>
              <Button onClick={() => flash(`Discovery session request sent to ${t.name}.`)} className="h-8 shrink-0 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                Book
              </Button>
            </div>
          ))}
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
        summary={cancelingSession ? `${cancelingSession.date} · ${cancelingSession.time}: ${cancelingSession.subject} with ${cancelingSession.tutor}` : ""}
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
