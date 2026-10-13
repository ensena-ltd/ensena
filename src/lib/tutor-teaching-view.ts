// Pure (client-safe) views over a TeachingSnapshot for one student.
import type { HomeworkRow, TeachingSnapshot, TeachingStudent } from "@/lib/tutor-teaching-server";

export interface StudentTimelineItem {
  key: string;
  kind: "private" | "group" | "discovery";
  title: string;
  startMs: number;
  endMs: number;
  /** Completed / Cancelled / Scheduled-style status as stored. */
  status: string;
  href: string | null;
}

export interface StudentTeachingView {
  student: TeachingStudent;
  timeline: StudentTimelineItem[];
  homework: HomeworkRow[];
}

export function studentTeachingView(data: TeachingSnapshot, studentId: string): StudentTeachingView | null {
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return null;
  const timeline: StudentTimelineItem[] = [];
  for (const l of data.lessons) {
    if (l.studentId !== studentId || l.holdExpired) continue;
    timeline.push({ key: `p-${l.id}`, kind: "private", title: l.subject, startMs: l.startMs, endMs: l.endMs, status: l.status === "Pending" ? "Upcoming" : l.status, href: `/tutor-dashboard/private-lessons/${l.id}` });
  }
  for (const d of data.discovery) {
    if (d.studentId !== studentId) continue;
    timeline.push({ key: `d-${d.id}`, kind: "discovery", title: d.subject ? `Discovery · ${d.subject}` : "Discovery Session", startMs: d.startMs, endMs: d.endMs, status: d.status === "Scheduled" ? "Upcoming" : d.status, href: null });
  }
  for (const c of data.groupClasses) {
    for (const k of c.cohorts) {
      const entry = k.roster.find((r) => r.studentId === studentId);
      if (!entry) continue;
      for (const s of k.sessions) {
        // A student who left the class keeps only the sessions from before they left.
        if (entry.status === "Cancelled" && s.status === "Scheduled") continue;
        timeline.push({ key: `g-${s.id}`, kind: "group", title: `${c.title} · Session ${s.number}`, startMs: s.startMs, endMs: s.endMs, status: s.status === "Scheduled" ? "Upcoming" : s.status, href: `/tutor-dashboard/group-classes/${c.slug}` });
      }
    }
  }
  timeline.sort((a, b) => a.startMs - b.startMs);
  return { student, timeline, homework: data.homework.filter((h) => h.studentId === studentId) };
}
