import type { Metadata } from "next";

import { DiscoveryClassroomClient } from "@/components/classroom/discovery-classroom-client";
import { getClassroomSession } from "@/lib/classroom-data";
import { LiveClassroomPage } from "@/components/classroom/live-classroom-page";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Only the static seed sessions exist at build/server time — a session
// booked at runtime (localStorage-only) is invisible to the server, so
// generateStaticParams/generateMetadata (both server-only) can only ever
// know about seeded ones. The actual session lookup that matters — the one
// deciding whether this classroom exists at all — happens client-side in
// DiscoveryClassroomClient, which CAN see a runtime booking.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (isSupabaseConfigured()) return { title: "Classroom | Ensena" };
  const session = getClassroomSession("tutor", "discovery", id);
  return { title: session ? `Discovery Session · Classroom | Ensena` : "Classroom | Ensena" };
}

export default async function TutorDiscoveryClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSupabaseConfigured()) return <LiveClassroomPage kind="discovery" id={id} role="tutor" leaveHref={"/tutor-dashboard/discovery-sessions"} />;
  return <DiscoveryClassroomClient role="tutor" id={id} leaveHref={`/tutor-dashboard/discovery-sessions/${id}/recommend`} />;
}
