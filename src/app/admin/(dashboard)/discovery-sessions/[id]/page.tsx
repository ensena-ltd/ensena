import { DiscoverySessionFullDetailsClient } from "@/components/admin/discovery-session-full-details-client";
import { discoverySessions } from "@/lib/discovery-sessions-data";

// Only the static seed sessions exist at build time — a session booked at
// runtime (localStorage-only, no server) is rendered on-demand instead
// (Next's default dynamicParams behavior for an id outside this list), so
// this must NOT gate on "is this id one of the statically-known ones" the
// way an early notFound() here would. DiscoverySessionFullDetailsClient
// does its own real (seed + runtime) lookup and handles a genuinely
// nonexistent id itself.
export function generateStaticParams() {
  return discoverySessions.map((d) => ({ id: d.id }));
}

export default async function AdminDiscoverySessionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DiscoverySessionFullDetailsClient sessionId={id} />;
}
