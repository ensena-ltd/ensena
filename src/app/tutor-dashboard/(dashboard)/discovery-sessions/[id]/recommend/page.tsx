import { DiscoveryRecommendationClient } from "@/components/tutor-dashboard/discovery-sessions/discovery-recommendation-client";

export default async function DiscoveryRecommendationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DiscoveryRecommendationClient sessionId={id} />;
}
