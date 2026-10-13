"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Eye, MonitorPlay, Users2 } from "lucide-react";

import { FullDetailsPageLayout, type FullDetailsAction } from "@/components/admin/shared/full-details-page-layout";
import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import { classroomIdForLesson, getLessonEvidence } from "@/lib/lesson-evidence";
import type { BookingRow } from "@/lib/admin-bookings-data";

// Same "Observe" design admin-classroom-observe-client.tsx already
// established for Group classes (FullDetailsPageLayout shell, the same
// stat-card row, the same "you are watching silently" banner) — a private
// lesson is 1:1 rather than a roster, so there's no student-monitoring
// list, but the page reads the same way. Unlike the Group observe page
// (which is built on synthetic demo monitoring data), this one only ever
// shows REAL evidence — lesson-evidence.ts's real attendance/whiteboard
// records when this booking resolves to a real classroom, and an honest
// empty state when it doesn't (this seed booking predates real classroom
// linkage — see classroomIdForLesson's own doc comment).
export function AdminPrivateClassroomObserveClient({ booking }: { booking: BookingRow }) {
  const [msgStudentOpen, setMsgStudentOpen] = useState(false);
  const [msgTutorOpen, setMsgTutorOpen] = useState(false);
  const classroomId = classroomIdForLesson(booking);
  const evidence = getLessonEvidence(booking);
  const hasRealData = classroomId !== null;

  const actions: FullDetailsAction[] = [
    { key: "msg-student", label: "Msg Student", onClick: () => setMsgStudentOpen(true) },
    { key: "msg-tutor", label: "Msg Tutor", onClick: () => setMsgTutorOpen(true) },
  ];

  return (
    <>
      <FullDetailsPageLayout
        backHref="/admin/bookings"
        backLabel="Back to Bookings"
        name={booking.subject}
        subtitle={`Observing · ${booking.student} with ${booking.tutor}`}
        badges={
          <span className="flex items-center gap-1 rounded-full bg-[#CBEFFF] px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            <Eye className="size-3" /> Observe Mode
          </span>
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
                  You are observing this lesson silently. Neither the tutor nor the student is notified. Leaving this
                  page does not affect the lesson.
                </div>

                {hasRealData ? (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Users2 className="size-4" /></div>
                        <p className="mt-2 text-lg font-semibold text-ensena-ink">{evidence.attendance.length}</p>
                        <p className="text-[11px] text-ensena-muted">Attendance Records</p>
                      </div>
                      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-4" /></div>
                        <p className="mt-2 text-lg font-semibold text-ensena-ink">{evidence.tutorMinutes} min</p>
                        <p className="text-[11px] text-ensena-muted">Tutor Participation</p>
                      </div>
                      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Clock className="size-4" /></div>
                        <p className="mt-2 text-lg font-semibold text-ensena-ink">{evidence.studentMinutes} min</p>
                        <p className="text-[11px] text-ensena-muted">Student Participation</p>
                      </div>
                      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-violet-700"><MonitorPlay className="size-4" /></div>
                        <p className="mt-2 text-lg font-semibold text-ensena-ink">{evidence.whiteboardBoardCount > 0 ? "Active" : "Idle"}</p>
                        <p className="text-[11px] text-ensena-muted">Whiteboard</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                      <h2 className="font-heading text-sm font-semibold text-ensena-ink">Session Timeline</h2>
                      <ul className="mt-3 flex flex-col gap-3">
                        {evidence.timeline.map((e, i) => (
                          <li key={i} className="flex gap-2.5 text-sm">
                            <span className="w-16 shrink-0 text-xs text-ensena-muted">{new Date(e.atISO).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                            <span className="text-ensena-ink">{e.label}</span>
                          </li>
                        ))}
                        {evidence.timeline.length === 0 && <p className="text-sm text-ensena-muted">No join/leave activity recorded yet for this lesson.</p>}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ensena-border p-10 text-center">
                    <AlertTriangle className="size-5 text-ensena-muted" />
                    <p className="text-sm font-semibold text-ensena-ink">Live monitoring not available</p>
                    <p className="max-w-md text-xs text-ensena-muted">
                      This booking predates real classroom-evidence linkage, so it can&apos;t be traced back to a
                      classroom&apos;s real attendance or activity.
                    </p>
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                  <h2 className="font-heading text-sm font-semibold text-ensena-ink">Lesson</h2>
                  <dl className="mt-2 divide-y divide-ensena-border text-sm">
                    <div className="flex justify-between gap-3 py-1.5"><dt className="text-ensena-muted">Subject</dt><dd className="font-medium text-ensena-ink">{booking.subject}</dd></div>
                    <div className="flex justify-between gap-3 py-1.5"><dt className="text-ensena-muted">Date &amp; Time</dt><dd className="font-medium text-ensena-ink">{booking.date}, {booking.time}</dd></div>
                    <div className="flex justify-between gap-3 py-1.5"><dt className="text-ensena-muted">Mode</dt><dd className="font-medium text-ensena-ink">{booking.mode}</dd></div>
                  </dl>
                </div>
              </div>
            ),
          },
        ]}
      />
      <AdminMsgTutorModal open={msgStudentOpen} onClose={() => setMsgStudentOpen(false)} recipientName={booking.student} role="Student" />
      <AdminMsgTutorModal open={msgTutorOpen} onClose={() => setMsgTutorOpen(false)} recipientName={booking.tutor} role="Tutor" />
    </>
  );
}
