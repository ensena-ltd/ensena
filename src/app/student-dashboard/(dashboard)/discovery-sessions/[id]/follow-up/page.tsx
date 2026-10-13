import { DiscoveryFollowUpClient } from "@/components/student-dashboard/discovery-sessions/discovery-followup-client";

export default async function DiscoveryFollowUpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DiscoveryFollowUpClient sessionId={id} />;
}
