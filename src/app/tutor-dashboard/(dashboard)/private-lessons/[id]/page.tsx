import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TutorClassDetailClient } from "@/components/tutor-dashboard/lessons/tutor-class-detail-client";
import { LessonDetailReal, type LessonEvent } from "@/components/tutor-dashboard/live/lesson-detail-real";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { initialPrivateLessons } from "@/lib/tutor-dashboard-data";
import { loadTutorTeaching } from "@/lib/tutor-teaching-server";

const UUID = /^[0-9a-f-]{36}$/i;

export function generateStaticParams() {
  return initialPrivateLessons.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const lesson = initialPrivateLessons.find((l) => l.id === id);
  return { title: lesson ? `${lesson.subject} | Ensena Tutor Dashboard` : "Class Details | Ensena" };
}

export default async function TutorClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id) || !isSupabaseConfigured()) return <TutorClassDetailClient id={id} />;

  const profile = await requireRole("tutor");
  if (!profile) notFound();
  const data = await loadTutorTeaching(profile.id);
  const lesson = data.lessons.find((l) => l.id === id);
  if (!lesson) notFound();
  const series = lesson.seriesId ? data.lessons.filter((l) => l.seriesId === lesson.seriesId).sort((a, b) => a.startMs - b.startMs) : [lesson];

  const { data: rows } = await getServiceRoleClient()
    .from("booking_events")
    .select("id, event_type, note, actor_id, created_at")
    .eq("private_lesson_id", lesson.id)
    .order("created_at");
  const events: LessonEvent[] = ((rows ?? []) as { id: string; event_type: string; note: string | null; actor_id: string | null; created_at: string }[]).map((e) => ({
    id: e.id,
    type: e.event_type,
    note: e.note,
    atMs: new Date(e.created_at).getTime(),
    byTutor: e.actor_id === profile.id,
  }));

  return <LessonDetailReal lesson={lesson} series={series} events={events} generatedAtMs={data.generatedAtMs} />;
}
