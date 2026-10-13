import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CircleCheck, XCircle } from "lucide-react";

import { ClassroomShell } from "@/components/classroom/classroom-shell";
import type { ClassroomKind, ClassroomRole } from "@/lib/classroom-data";
import { loadLiveClassroom } from "@/lib/classroom-live-server";
import { requireRole } from "@/lib/supabase/require-role";

const fmt = (ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(ms);

/**
 * Server-rendered classroom for the real (Supabase) app: the booking row in
 * the database decides who can enter, when, and whether it's paid for.
 */
export async function LiveClassroomPage({ kind, id, role, leaveHref }: { kind: ClassroomKind; id: string; role: ClassroomRole; leaveHref: string }) {
  const profile = await requireRole(role);
  if (!profile) notFound();
  const result = await loadLiveClassroom(kind, id, { id: profile.id, role });
  if (result.status === "not-found") notFound();
  if (result.status === "ok") return <ClassroomShell role={role} session={result.session} leaveHref={leaveHref} />;

  const copy =
    result.status === "too-early"
      ? { icon: CalendarClock, title: "This classroom isn't open yet", body: `${result.title} opens at ${fmt(result.opensAtMs)} (West Africa Time).` }
      : result.status === "ended"
        ? { icon: CircleCheck, title: "This class has ended", body: `${result.title} is over. You'll find it under your completed classes.` }
        : { icon: XCircle, title: "This class was cancelled", body: `${result.title} was cancelled, so its classroom is closed.` };
  const Icon = copy.icon;
  return (
    <div className="flex min-h-screen items-center justify-center bg-ensena-bg-soft p-4">
      <div className="w-full max-w-md rounded-3xl border border-ensena-border bg-ensena-surface p-8 text-center">
        <Icon className="mx-auto size-12 text-ensena-primary" />
        <h1 className="mt-3 font-heading text-xl font-semibold text-ensena-ink">{copy.title}</h1>
        <p className="mt-2 text-sm text-ensena-muted">{copy.body}</p>
        <Link href={leaveHref} className="mt-6 inline-flex rounded-full bg-ensena-primary px-5 py-2.5 text-sm font-semibold text-white">
          Go back
        </Link>
      </div>
    </div>
  );
}
