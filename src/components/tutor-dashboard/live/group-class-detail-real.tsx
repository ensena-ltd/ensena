"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, MessageSquare, Pencil, Video, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelGroupClass, cancelGroupSession, markGroupSessionCompleted, setGroupClassPublished, updateGroupClassDetails } from "@/lib/actions/tutor-teaching";
import { formatNaira } from "@/lib/format";
import type { TeachingGroupClass, TeachingGroupSession } from "@/lib/tutor-teaching-server";

import { PersonAvatar, ReasonModal, StatusBadge, canTutorEnter, fullWhen, useLiveNow } from "./teaching-shared";
import { cohortLine } from "./tutor-classes-real";

export function GroupClassDetailReal({ groupClass: c, approved, generatedAtMs }: { groupClass: TeachingGroupClass; approved: boolean; generatedAtMs: number }) {
  const router = useRouter();
  const nowMs = useLiveNow(generatedAtMs);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(c.description);
  const [outcomes, setOutcomes] = useState(c.learningOutcomes.join("\n"));
  const [cancelSession, setCancelSession] = useState<TeachingGroupSession | null>(null);
  const [cancelClassOpen, setCancelClassOpen] = useState(false);

  const cohort = c.cohorts[c.cohorts.length - 1];
  const roster = cohort?.roster ?? [];
  const activeRoster = roster.filter((r) => r.status === "Active");
  const live = c.status !== "Cancelled" && c.status !== "Completed";

  function run(key: string, action: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    setBusy(key);
    startTransition(async () => {
      const result = await action();
      setBusy(null);
      if (!result.ok) {
        toast.error(result.message ?? "Something went wrong.");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  async function saveDetails() {
    setBusy("details");
    const result = await updateGroupClassDetails(c.id, { description, learningOutcomes: outcomes.split("\n") });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.message ?? "We couldn't save the class details.");
      return;
    }
    setEditing(false);
    toast.success("Class details saved.");
    router.refresh();
  }

  return (
    <div>
      <Link href="/tutor-dashboard/private-lessons?tab=Group Classes" className="inline-flex items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ArrowLeft className="size-4" /> Group classes
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{c.title}</h1>
            <StatusBadge status={c.status} />
          </div>
          <p className="mt-1 text-sm text-ensena-muted">{[c.subject, c.academicLevel, c.mode, c.language].filter(Boolean).join(" · ")}</p>
        </div>
        {live && (
          <div className="flex flex-wrap gap-2">
            {c.status === "Draft" ? (
              <Button
                onClick={() => run("publish", () => setGroupClassPublished(c.id, true), "Class published — students can now find and join it.")}
                loading={busy === "publish"}
                disabled={!approved}
                title={approved ? undefined : "Available once your tutor application is approved"}
                className="h-10 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Eye className="size-4" /> Publish
              </Button>
            ) : (
              <Button variant="outline" onClick={() => run("publish", () => setGroupClassPublished(c.id, false), "Class unpublished — it's hidden from new students.")} loading={busy === "publish"} className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium">
                <EyeOff className="size-4" /> Unpublish
              </Button>
            )}
            <Button variant="outline" onClick={() => setCancelClassOpen(true)} className="h-10 rounded-full border-rose-200 px-4 text-sm font-medium text-rose-600 hover:bg-rose-50">
              <XCircle className="size-4" /> Cancel class
            </Button>
          </div>
        )}
      </div>
      {c.status === "Draft" && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          {approved ? "This class is a draft — students can't see it yet. Publish it when you're happy with the details." : "This class is a draft. You can publish it once your tutor application is approved."}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">About this class</h2>
              {live && !editing && (
                <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                  <Pencil className="size-3.5" /> Edit
                </button>
              )}
            </div>
            {editing ? (
              <div className="mt-3 flex flex-col gap-3">
                <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 3000))} rows={4} className="rounded-xl border border-ensena-border p-3 text-sm" placeholder="What the class covers" />
                <textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={3} className="rounded-xl border border-ensena-border p-3 text-sm" placeholder="Learning outcomes, one per line" />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)} className="h-9 rounded-full border-ensena-border px-4 text-xs font-medium">
                    Cancel
                  </Button>
                  <Button onClick={saveDetails} loading={busy === "details"} className="h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white">
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-2 whitespace-pre-line text-sm text-ensena-ink">{c.description || <span className="text-ensena-muted">No description yet.</span>}</p>
                {c.learningOutcomes.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {c.learningOutcomes.map((o) => (
                      <li key={o} className="flex items-start gap-2 text-sm text-ensena-ink">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ensena-success" /> {o}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          {cohort && (
            <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Sessions</h2>
              <p className="text-xs text-ensena-muted">
                {cohortLine(cohort.days, cohort.time)} · {cohort.durationMinutes} min each (WAT)
              </p>
              <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
                {cohort.sessions.map((s) => {
                  const enterable = c.status === "Published" && s.status === "Scheduled" && canTutorEnter(s.startMs, s.endMs, nowMs);
                  const needsCompleting = s.status === "Scheduled" && s.endMs <= nowMs;
                  const cancellable = live && s.status === "Scheduled" && s.startMs > nowMs;
                  return (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-ensena-ink">Session {s.number}</p>
                        <p className="text-xs text-ensena-muted">{fullWhen(s.startMs)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={needsCompleting ? "Needs completing" : s.status} />
                        {enterable && (
                          <Button nativeButton={false} render={<Link href={`/tutor-dashboard/classroom/group/${c.id}`} />} className="h-8 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white">
                            <Video className="size-3.5" /> Enter
                          </Button>
                        )}
                        {needsCompleting && (
                          <Button onClick={() => run(`done-${s.id}`, () => markGroupSessionCompleted(c.id, s.id), `Session ${s.number} marked complete.`)} loading={busy === `done-${s.id}`} className="h-8 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white">
                            Mark complete
                          </Button>
                        )}
                        {cancellable && (
                          <button type="button" onClick={() => setCancelSession(s)} className="text-xs font-medium text-rose-600 hover:underline">
                            Cancel
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          {cohort && (
            <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <p className="font-heading text-2xl font-semibold text-ensena-ink">{cohort.price > 0 ? formatNaira(cohort.price) : "Free"}</p>
              <p className="text-xs text-ensena-muted">per student · {cohort.sessions.length} sessions</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-ensena-muted">Enrolled</span>
                <span className="font-semibold text-ensena-ink">
                  {activeRoster.length}/{cohort.seatsTotal}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ensena-border">
                <div className="h-full rounded-full bg-ensena-success" style={{ width: `${cohort.seatsTotal ? Math.min(100, (activeRoster.length / cohort.seatsTotal) * 100) : 0}%` }} />
              </div>
            </section>
          )}
          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Students ({activeRoster.length})</h2>
            {roster.length === 0 ? (
              <p className="mt-2 text-xs text-ensena-muted">{c.status === "Published" ? "No one has joined yet. Students can find this class under Group Classes." : "Students can join once the class is published."}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2.5">
                {roster.map((r) => (
                  <li key={r.enrollmentId} className="flex items-center gap-2.5">
                    <PersonAvatar name={r.studentName} image={r.studentImage} className="size-8 text-xs" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/tutor-dashboard/students/${r.studentId}`} className="block truncate text-sm font-medium text-ensena-ink hover:underline">
                        {r.studentName}
                      </Link>
                      {r.status !== "Active" && <p className="text-[11px] text-ensena-muted">{r.status}</p>}
                    </div>
                    <Link href={`/tutor-dashboard/messages?student=${r.studentId}`} aria-label={`Message ${r.studentName}`} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                      <MessageSquare className="size-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <ReasonModal
        open={!!cancelSession}
        title={`Cancel session ${cancelSession?.number ?? ""}?`}
        description={cancelSession && <>Every enrolled student is told straight away that the {fullWhen(cancelSession.startMs)} session won&apos;t happen.</>}
        confirmLabel="Cancel session"
        placeholder="Reason (students will see this)"
        onClose={() => setCancelSession(null)}
        onConfirm={async (reason) => {
          if (!cancelSession) return false;
          const result = await cancelGroupSession(c.id, cancelSession.id, reason);
          if (!result.ok) {
            toast.error(result.message ?? "We couldn't cancel that session.");
            return false;
          }
          toast.success("Session cancelled and your students have been told.");
          router.refresh();
          return true;
        }}
      />
      <ReasonModal
        open={cancelClassOpen}
        title="Cancel the whole class?"
        description={<>All remaining sessions are cancelled{activeRoster.length ? ` and ${activeRoster.length} enrolled ${activeRoster.length === 1 ? "student is" : "students are"} told and owed a refund` : ""}. This can&apos;t be undone.</>}
        confirmLabel="Cancel class"
        placeholder="Reason (students will see this)"
        onClose={() => setCancelClassOpen(false)}
        onConfirm={async (reason) => {
          const result = await cancelGroupClass(c.id, reason);
          if (!result.ok) {
            toast.error(result.message ?? "We couldn't cancel the class.");
            return false;
          }
          toast.success("Class cancelled.");
          router.refresh();
          return true;
        }}
      />
    </div>
  );
}
