"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Mic,
  MicOff,
  MonitorPlay,
  Users2,
  Wifi,
  WifiOff,
} from "lucide-react";

import { FullDetailsPageLayout, type FullDetailsAction } from "@/components/admin/shared/full-details-page-layout";
import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import {
  buildLiveClassroomState,
  buildSessionTimeline,
  studentConnectionStyles,
  type GroupClassRow,
} from "@/lib/admin-group-classes-data";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function useElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// Admin "Observe" = a monitoring dashboard, not a classroom seat. It
// deliberately stays inside admin/(dashboard) — sidebar and top bar still
// visible — the opposite of Join (which escapes the dashboard chrome
// entirely to become a full-screen classroom presence). No video tiles, no
// mic/camera controls, no chat the class can see: this reads as "the admin
// is still in the admin dashboard, looking at live data," which is exactly
// the distinction the product asks for between intervening and monitoring.
export function AdminClassroomObserveClient({ groupClass }: { groupClass: GroupClassRow }) {
  const timer = useElapsedTimer();
  const liveState = useMemo(() => buildLiveClassroomState(groupClass), [groupClass]);
  const timeline = useMemo(() => buildSessionTimeline(groupClass, liveState), [groupClass, liveState]);
  const [msgTutorOpen, setMsgTutorOpen] = useState(false);

  const connectedCount = liveState.students.filter((s) => s.connection !== "Disconnected").length;
  const lateCount = liveState.students.filter((s) => s.connection === "Joined Late").length;
  const disconnectedCount = liveState.students.filter((s) => s.connection === "Disconnected").length;
  const poorConnectionCount = liveState.students.filter((s) => s.connection === "Poor Connection").length;

  const actions: FullDetailsAction[] = [
    { key: "msg-tutor", label: "Msg Tutor", onClick: () => setMsgTutorOpen(true) },
  ];

  return (
    <>
    <FullDetailsPageLayout
      backHref="/admin/group-classes?tab=Live Now"
      backLabel="Back to Group Classes"
      name={groupClass.title}
      subtitle={`Observing · Tutor: ${groupClass.tutor}`}
      badges={
        <>
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <Circle className="size-2 fill-emerald-600 text-emerald-600" /> LIVE
          </span>
          <span className="flex items-center gap-1 rounded-full bg-[#CBEFFF] px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            <Eye className="size-3" /> Observe Mode
          </span>
        </>
      }
      actions={actions}
      tabs={[
        {
          key: "monitoring",
          label: "Live Monitoring",
          content: (
            <div>
              <div className="flex items-center gap-2 rounded-2xl bg-[#CBEFFF]/50 p-3.5 text-sm text-blue-800">
                <Eye className="size-4 shrink-0" />
                You are observing this class silently. You are not visible as a participant, not counted in the student
                list, and the tutor and students have not been notified. Leaving this page does not affect the class.
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Users2 className="size-4" /></div>
                  <p className="mt-2 text-lg font-semibold text-ensena-ink">{connectedCount} / {liveState.students.length}</p>
                  <p className="text-[11px] text-ensena-muted">Students Connected</p>
                </div>
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-4" /></div>
                  <p className="mt-2 text-lg font-semibold text-ensena-ink">{groupClass.attendance.avgAttendancePct}%</p>
                  <p className="text-[11px] text-ensena-muted">Attendance</p>
                </div>
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Clock className="size-4" /></div>
                  <p className="mt-2 text-lg font-semibold text-ensena-ink">{lateCount}</p>
                  <p className="text-[11px] text-ensena-muted">Joined Late</p>
                </div>
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-rose-100 text-rose-700"><WifiOff className="size-4" /></div>
                  <p className="mt-2 text-lg font-semibold text-ensena-ink">{disconnectedCount}</p>
                  <p className="text-[11px] text-ensena-muted">Disconnected</p>
                </div>
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="size-4" /></div>
                  <p className="mt-2 text-lg font-semibold text-ensena-ink">{poorConnectionCount}</p>
                  <p className="text-[11px] text-ensena-muted">Connection Problems</p>
                </div>
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Wifi className="size-4" /></div>
                  <p className="mt-2 text-lg font-semibold text-ensena-ink">{liveState.tutorConnection}</p>
                  <p className="text-[11px] text-ensena-muted">Tutor Connection</p>
                </div>
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-violet-700"><MonitorPlay className="size-4" /></div>
                  <p className="mt-2 text-lg font-semibold text-ensena-ink">{groupClass.classroom.whiteboardActive ? "Active" : "Idle"}</p>
                  <p className="text-[11px] text-ensena-muted">Whiteboard</p>
                </div>
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-ink"><Clock className="size-4" /></div>
                  <p className="mt-2 text-lg font-semibold text-ensena-ink">{timer}</p>
                  <p className="text-[11px] text-ensena-muted">Session Duration</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
                {/* Student monitoring */}
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                  <h2 className="font-heading text-sm font-semibold text-ensena-ink">Student Monitoring</h2>
                  <ul className="mt-3 flex flex-col gap-2">
                    {liveState.students.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 rounded-xl border border-ensena-border p-2.5 text-sm">
                        <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-ensena-bg-soft">
                          <Image src={s.image} alt={s.name} fill sizes="32px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-ensena-ink">{s.name}</p>
                          <p className="text-[11px] text-ensena-muted">{s.connection === "Joined Late" ? `Joined late · ${s.joinedAt}` : `Joined ${s.joinedAt}`}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 text-ensena-muted">
                          {s.camOn ? <Camera className="size-3.5" /> : <CameraOff className="size-3.5" />}
                          {s.micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", studentConnectionStyles[s.connection])}>
                          {s.connection}
                        </span>
                      </li>
                    ))}
                    {liveState.students.length === 0 && <p className="text-sm text-ensena-muted">No students connected yet.</p>}
                  </ul>
                </div>

                {/* Classroom snapshot + timeline */}
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                    <h2 className="font-heading text-sm font-semibold text-ensena-ink">Classroom Activity</h2>
                    <div className="mt-3 flex flex-col gap-2 text-sm">
                      <div className="flex items-center justify-between rounded-xl bg-ensena-bg-soft px-3 py-2">
                        <span className="flex items-center gap-1.5 text-ensena-ink"><MonitorPlay className="size-3.5 text-violet-600" /> Whiteboard</span>
                        <span className="text-xs font-medium text-ensena-muted">{groupClass.classroom.whiteboardActive ? "Tutor is presenting" : "Not in use"}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-ensena-bg-soft px-3 py-2">
                        <span className="flex items-center gap-1.5 text-ensena-ink"><Circle className={cn("size-3.5", groupClass.classroom.recordingAvailable ? "fill-rose-500 text-rose-500" : "text-ensena-muted")} /> Recording</span>
                        <span className="text-xs font-medium text-ensena-muted">{groupClass.classroom.recordingAvailable ? "In progress" : "Not recording"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                    <h2 className="font-heading text-sm font-semibold text-ensena-ink">Session Timeline</h2>
                    <ul className="mt-3 flex flex-col gap-3">
                      {timeline.map((e, i) => (
                        <li key={i} className="flex gap-2.5 text-sm">
                          <span className="w-11 shrink-0 text-xs text-ensena-muted">{e.time}</span>
                          <span className="text-ensena-ink">{e.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ),
        },
      ]}
    />
    <AdminMsgTutorModal open={msgTutorOpen} onClose={() => setMsgTutorOpen(false)} recipientName={groupClass.tutor} />
    </>
  );
}
