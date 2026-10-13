"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { FullDetailsPageLayout, type FullDetailsAction } from "@/components/admin/shared/full-details-page-layout";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { initialAdminTutors } from "@/lib/admin-data";
import { bookingStatusStyles, formatPaymentPlan, initialBookings, paymentPlanTotal } from "@/lib/admin-bookings-data";
import { getChatMessages } from "@/lib/classroom-chat-store";
import { formatNaira } from "@/lib/format";
import { classroomIdForLesson, getLessonEvidence } from "@/lib/lesson-evidence";
import { lessonConfirmationToBookingRow } from "@/lib/lesson-confirmation-to-booking-row";
import { formatPaymentPlanLabel, getBookingPaymentSummary } from "@/lib/payment-plans-store";
import { getPrivateLessons } from "@/lib/private-lessons-store";
import { cn } from "@/lib/utils";

function EmptyEvidence({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ensena-border p-10 text-center">
      <AlertTriangle className="size-5 text-ensena-muted" />
      <p className="text-sm font-semibold text-ensena-ink">{title}</p>
      <p className="max-w-md text-xs text-ensena-muted">{reason}</p>
    </div>
  );
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function LessonFullDetailsClient({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  // A real, completed lesson only ever exists as a LessonConfirmation
  // (escrow-store.ts) — checked first so a real Group session's evidence
  // (which needs its real groupClassId/sessionId/completedAtMs, only the
  // adapter below populates) is actually reachable here, not just seed rows.
  const { lessons: escrowLessons } = useLessonConfirmations();
  const lesson = escrowLessons.map(lessonConfirmationToBookingRow).find((b) => b.id === lessonId) ?? initialBookings.find((b) => b.id === lessonId);
  if (!lesson) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ensena-border p-16 text-center">
        <AlertTriangle className="size-5 text-ensena-muted" />
        <p className="text-sm font-semibold text-ensena-ink">Lesson not found</p>
        <p className="max-w-md text-xs text-ensena-muted">No lesson with this id exists.</p>
      </div>
    );
  }

  const evidence = getLessonEvidence(lesson);
  const classroomId = classroomIdForLesson(lesson);
  const sourceTutor = initialAdminTutors.find((t) => t.name === lesson.tutor);

  // A real (escrow-confirmed) Private lesson's own id is the same id it was
  // created with in private-lessons-store.ts, so its real bookingId (or its
  // own id, for a standalone one-time lesson) is directly recoverable — the
  // one authoritative source every dashboard (student/tutor/admin) reads,
  // never the static, disconnected admin-bookings-data.ts `paymentPlan`
  // field, which a real runtime booking never populates. A static seed row
  // has no matching real PrivateLesson, so it falls through to the legacy
  // block below unchanged.
  const realPrivateLesson = lesson.type === "Private Lesson" ? getPrivateLessons().find((pl) => pl.id === lesson.id) : undefined;
  const realPaymentSummary = realPrivateLesson ? getBookingPaymentSummary(realPrivateLesson.bookingId ?? realPrivateLesson.id) : null;
  const noClassroomLink = !classroomId; // legacy row predating groupClassId/lesson id linkage — see lesson-evidence.ts's doc comment
  const chatMessages = classroomId ? getChatMessages(classroomId, []) : [];

  // Only a real destination when the tutor can actually be resolved to an
  // admin profile — no fake toast standing in for a real action.
  const actions: FullDetailsAction[] = sourceTutor
    ? [{ key: "message", label: "Message Tutor", variant: "primary", onClick: () => router.push(`/admin/tutors/${sourceTutor.id}`) }]
    : [];

  const evidenceSummaryItems = [
    { key: "attendance", label: "Attendance", value: evidence.attendance.length > 0 ? `${evidence.attendance.length} record${evidence.attendance.length === 1 ? "" : "s"}` : "Not available" },
    { key: "timeline", label: "Timeline", value: evidence.timeline.length > 0 ? `${evidence.timeline.length} events` : "Not available" },
    { key: "whiteboard", label: "Whiteboard", value: evidence.whiteboardBoardCount > 0 ? `${evidence.whiteboardBoardCount} board${evidence.whiteboardBoardCount === 1 ? "" : "s"} used` : "Not used" },
    { key: "recording", label: "Recording", value: evidence.recording?.status === "ready" ? "Available" : "Not available" },
    { key: "homework", label: "Homework", value: "Not linked to this session" },
    { key: "chat", label: "Chat", value: chatMessages.length > 0 ? `${chatMessages.length} message${chatMessages.length === 1 ? "" : "s"}` : "Not available" },
  ];

  return (
    <div>
      <FullDetailsPageLayout
        backHref="/admin/lessons"
        backLabel="Back to Lessons"
        name={lesson.subject}
        subtitle={`${lesson.student} · ${lesson.tutor}${lesson.bookingReference ? ` · Lesson ID ${lesson.bookingReference}` : ""}`}
        badges={<span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", bookingStatusStyles[lesson.status])}>{lesson.status}</span>}
        actions={actions}
        tabs={[
          {
            key: "overview",
            label: "Overview",
            content: (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-ensena-border p-4">
                  <p className="text-sm font-semibold text-ensena-ink">Lesson Details</p>
                  <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                    {lesson.bookingReference && <div className="flex justify-between"><dt className="text-ensena-muted">Lesson ID</dt><dd className="font-medium text-ensena-ink">{lesson.bookingReference}</dd></div>}
                    <div className="flex justify-between"><dt className="text-ensena-muted">Date &amp; Time</dt><dd className="text-ensena-ink">{lesson.date}, {lesson.time}</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Scheduled Duration</dt><dd className="text-ensena-ink">{lesson.durationMins} mins</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Mode</dt><dd className="text-ensena-ink">{lesson.mode}</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Topic</dt><dd className="text-ensena-ink">{lesson.topic}</dd></div>
                    {evidence.attendance.length > 0 && (
                      <>
                        <div className="flex justify-between"><dt className="text-ensena-muted">Tutor Participation</dt><dd className="text-ensena-ink">{evidence.tutorMinutes} min</dd></div>
                        <div className="flex justify-between"><dt className="text-ensena-muted">Student Participation</dt><dd className="text-ensena-ink">{evidence.studentMinutes} min</dd></div>
                      </>
                    )}
                  </dl>
                </div>

                {realPaymentSummary ? (
                  <div className="rounded-2xl border border-ensena-border p-4">
                    <p className="text-sm font-semibold text-ensena-ink">Payment Plan</p>
                    <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                      <div className="flex justify-between"><dt className="text-ensena-muted">Plan</dt><dd className="text-ensena-ink">{formatPaymentPlanLabel(realPaymentSummary)}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Amount Paid</dt><dd className="font-semibold text-ensena-ink">{formatNaira(realPaymentSummary.amountPaid)}</dd></div>
                      {realPaymentSummary.subscriptionStatus && (
                        <div className="flex justify-between"><dt className="text-ensena-muted">Auto-pay Status</dt><dd className="text-ensena-ink">{realPaymentSummary.subscriptionStatus}</dd></div>
                      )}
                    </dl>
                  </div>
                ) : (
                  lesson.paymentPlan && (
                    <div className="rounded-2xl border border-ensena-border p-4">
                      <p className="text-sm font-semibold text-ensena-ink">Payment Plan</p>
                      <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                        <div className="flex justify-between"><dt className="text-ensena-muted">Plan</dt><dd className="text-ensena-ink">{formatPaymentPlan(lesson.paymentPlan)}</dd></div>
                        <div className="flex justify-between"><dt className="text-ensena-muted">Sessions Paid</dt><dd className="text-ensena-ink">{lesson.paymentPlan.sessionsPaid}</dd></div>
                        <div className="flex justify-between"><dt className="text-ensena-muted">Amount per Session</dt><dd className="text-ensena-ink">{formatNaira(lesson.paymentPlan.amountPerSession)}</dd></div>
                        <div className="flex justify-between"><dt className="text-ensena-muted">Total Paid</dt><dd className="font-semibold text-ensena-ink">{formatNaira(paymentPlanTotal(lesson.paymentPlan))}</dd></div>
                      </dl>
                    </div>
                  )
                )}

                <div className="rounded-2xl border border-ensena-border p-4">
                  <p className="text-sm font-semibold text-ensena-ink">Lesson Evidence</p>
                  <p className="mt-0.5 text-xs text-ensena-muted">What Enseña captured for this specific session. See the tabs above for full detail.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {evidenceSummaryItems.map((item) => (
                      <div key={item.key} className="rounded-xl bg-ensena-bg-soft p-3">
                        <p className="text-xs text-ensena-muted">{item.label}</p>
                        <p className={cn("mt-0.5 text-sm font-semibold", item.value === "Not available" || item.value === "Not used" || item.value === "Not linked to this session" ? "text-ensena-muted" : "text-ensena-ink")}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {lesson.aiSummary && (
                  <div className="rounded-2xl bg-ensena-primary/5 p-4">
                    <p className="text-sm font-semibold text-ensena-ink">Session Summary</p>
                    <p className="mt-1.5 text-sm text-ensena-muted">{lesson.aiSummary}</p>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "attendance",
            label: "Attendance",
            content: noClassroomLink ? (
              <EmptyEvidence title="Attendance not available" reason="This booking predates real classroom-evidence linkage, so it can't be traced back to a classroom." />
            ) : evidence.attendance.length === 0 ? (
              <EmptyEvidence title="No attendance recorded" reason="Neither party's browser ever opened this lesson's classroom, or the record hasn't synced to this device yet." />
            ) : (
              <div className="flex flex-col gap-3">
                {lesson.type === "Group Class" && (
                  <p className="text-xs text-ensena-muted">
                    Filtered to real join/leave events around this session&apos;s actual end time. A recurring class&apos;s classroom history covers every session, not just this one.
                  </p>
                )}
                <div className="overflow-x-auto rounded-2xl border border-ensena-border">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                        <th className="p-3 font-medium">Participant</th>
                        <th className="p-3 font-medium">Role</th>
                        <th className="p-3 font-medium">Joined</th>
                        <th className="p-3 font-medium">Left</th>
                        <th className="p-3 font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidence.attendance.map((r, i) => (
                        <tr key={i} className="border-b border-ensena-border last:border-0">
                          <td className="p-3 font-medium text-ensena-ink">{r.participantName}</td>
                          <td className="p-3 text-ensena-muted capitalize">{r.participantRole}</td>
                          <td className="p-3 text-ensena-ink">{fmtTime(r.joinedAtISO)}</td>
                          <td className="p-3 text-ensena-ink">{r.leftAtISO ? fmtTime(r.leftAtISO) : "—"}</td>
                          <td className="p-3 text-ensena-ink">{r.leftAtISO ? `${Math.round((new Date(r.leftAtISO).getTime() - new Date(r.joinedAtISO).getTime()) / 60000)} min` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ),
          },
          {
            key: "timeline",
            label: "Timeline",
            content: evidence.timeline.length === 0 ? (
              <EmptyEvidence title="No timeline available" reason="A session timeline is built from real classroom join/leave events. None were recorded for this session." />
            ) : (
              <div className="rounded-2xl border border-ensena-border p-4">
                <ol className="flex flex-col gap-2.5 text-sm">
                  {evidence.timeline.map((e, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-xs font-medium text-ensena-muted">{fmtTime(e.atISO)}</span>
                      <span className="size-1.5 shrink-0 rounded-full bg-ensena-primary" />
                      <span className="text-ensena-ink">{e.label}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ),
          },
          {
            key: "whiteboard",
            label: "Whiteboard",
            content: evidence.whiteboardBoardCount === 0 ? (
              <EmptyEvidence title="Whiteboard not used" reason="No whiteboard activity was saved for this session." />
            ) : (
              <div className="rounded-2xl border border-ensena-border p-4">
                <p className="text-sm font-semibold text-ensena-ink">{evidence.whiteboardBoardCount} board{evidence.whiteboardBoardCount === 1 ? "" : "s"} used</p>
                {evidence.whiteboardLastUpdatedISO && (
                  <p className="mt-1 text-xs text-ensena-muted">Last updated {new Date(evidence.whiteboardLastUpdatedISO).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                )}
                <p className="mt-3 text-xs text-ensena-muted">
                  The whiteboard preserves the latest state of each board, not a stroke-by-stroke replay. Open the classroom&apos;s whiteboard tool directly to inspect the saved board content.
                  {evidence.whiteboardAndRecordingAreWholeClass && " This reflects the whole recurring class's shared whiteboard, not only this one session."}
                </p>
              </div>
            ),
          },
          {
            key: "recording",
            label: "Recording",
            content: evidence.recording?.status === "ready" ? (
              <div className="rounded-2xl border border-ensena-border p-4">
                <p className="text-sm font-semibold text-ensena-ink">Recording available</p>
                <p className="mt-1 text-xs text-ensena-muted">{evidence.recording.segments.length} segment{evidence.recording.segments.length === 1 ? "" : "s"}</p>
              </div>
            ) : (
              <EmptyEvidence
                title="Recording not available for this session"
                reason="Enseña's classroom does not yet capture video/audio recordings. This is an honest gap, not a lost file. Attendance, timeline, and whiteboard evidence above are the real record of this session."
              />
            ),
          },
          {
            key: "homework",
            label: "Homework",
            content: <EmptyEvidence title="Homework not linked to this session" reason="Homework assignments aren't currently tied to a specific lesson/session id. Check the tutor's or student's Homework page for assignments around this date." />,
          },
          {
            key: "chat",
            label: "Chat",
            content: noClassroomLink ? (
              <EmptyEvidence title="Chat not available" reason="This booking predates real classroom-evidence linkage, so it can't be traced back to a classroom." />
            ) : chatMessages.length === 0 ? (
              <EmptyEvidence title="No chat messages" reason="Nobody sent an in-classroom chat message during this lesson." />
            ) : (
              <div className="flex flex-col gap-3">
                {evidence.whiteboardAndRecordingAreWholeClass && (
                  <p className="text-xs text-ensena-muted">
                    This is the whole recurring class&apos;s shared chat history, not filtered to this one session. In-classroom chat has no per-session record the way attendance does.
                  </p>
                )}
                <div className="flex flex-col gap-2 rounded-2xl border border-ensena-border p-4">
                  {chatMessages.map((m) => (
                    <div key={m.id} className="flex items-baseline gap-2 text-sm">
                      <span className="shrink-0 text-xs font-medium text-ensena-muted">{m.time}</span>
                      <span className="shrink-0 font-semibold text-ensena-ink">{m.sender}:</span>
                      <span className="text-ensena-ink">{m.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
