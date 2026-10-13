import { DiscoveryClassroomClient } from "@/components/classroom/discovery-classroom-client";
import { LiveClassroomPage } from "@/components/classroom/live-classroom-page";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function StudentDiscoveryClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSupabaseConfigured()) return <LiveClassroomPage kind="discovery" id={id} role="student" leaveHref={"/student-dashboard/lessons?tab=Completed"} />;
  return <DiscoveryClassroomClient role="student" id={id} leaveHref={`/student-dashboard/discovery-sessions/${id}/follow-up`} />;
}
