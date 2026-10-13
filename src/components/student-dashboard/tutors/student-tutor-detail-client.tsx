"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calendar, FileText, MessageSquare, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTutorRating } from "@/hooks/use-reviews";
import {
  studentLessonStatusStyles,
  studentLessons,
  studentRecentHomework,
  type StudentTutor,
} from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

export function StudentTutorDetailClient({ tutor }: { tutor: StudentTutor }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);

  const lessonHistory = useMemo(() => studentLessons.filter((l) => l.tutor === tutor.name), [tutor.name]);
  const homework = useMemo(() => studentRecentHomework.filter((h) => h.tutor === tutor.name), [tutor.name]);
  const avgProgress = tutor.subjects.length > 0 ? Math.round(60 + rating.rating * 6) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full">
            <Image src={tutor.image} alt={tutor.name} fill sizes="64px" className="object-cover" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold text-ensena-ink">{tutor.name}</h1>
            <p className="flex items-center gap-1 text-sm text-ensena-muted">
              <Star className="size-3.5 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews} reviews) · {tutor.subjects.join(", ")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(tutor.name)}`)}
            className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium"
          >
            <MessageSquare className="size-4" /> Message
          </Button>
          <Button
            onClick={() => router.push("/find-teachers")}
            className="h-10 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-5 text-sm font-semibold text-white"
          >
            <Calendar className="size-4" /> Book Again
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">About {tutor.name.split(" ")[0]}</h2>
            <p className="mt-2 text-sm text-ensena-muted">{tutor.bio}</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ensena-muted">
              <span>{tutor.education}</span>
              <span>Languages: {tutor.languages.join(", ")}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Your Lesson History</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Subject</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lessonHistory.map((l) => (
                    <tr key={l.id} className="border-b border-ensena-border last:border-0">
                      <td className="py-2.5 pr-4 text-ensena-muted">{l.date}</td>
                      <td className="py-2.5 pr-4 font-medium text-ensena-ink">{l.subject}</td>
                      <td className="py-2.5 pr-4">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", studentLessonStatusStyles[l.status])}>{l.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lessonHistory.length === 0 && <p className="py-4 text-sm text-ensena-muted">No lessons yet with this tutor.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
              <FileText className="size-4.5 text-ensena-primary" /> Homework
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {homework.map((h) => (
                <li key={h.title} className="flex items-center justify-between rounded-xl border border-ensena-border p-3 text-sm">
                  <span className="font-medium text-ensena-ink">{h.title}</span>
                  <span className={cn("text-xs font-semibold", h.status === "Pending" ? "text-amber-600" : "text-ensena-success")}>{h.status}</span>
                </li>
              ))}
              {homework.length === 0 && <p className="text-sm text-ensena-muted">No homework assigned yet.</p>}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Progress with {tutor.name.split(" ")[0]}</h2>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ensena-bg-soft">
              <div className="h-full rounded-full bg-ensena-primary" style={{ width: `${avgProgress}%` }} />
            </div>
            <p className="mt-1 text-xs text-ensena-muted">{avgProgress}% average subject progress</p>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Files</h2>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {["Lesson Notes Week 3.pdf", "Practice Worksheet.pdf"].map((f) => (
                <li key={f} className="flex items-center gap-2 rounded-lg border border-ensena-border p-2.5">
                  <FileText className="size-4 text-ensena-muted" /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Your Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add private notes about this tutor…"
              className="mt-2 w-full rounded-xl border border-ensena-border p-3 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
