import { AdminDisputeReviewClient } from "@/components/admin/admin-dispute-review-client";
import { initialLessonConfirmations } from "@/lib/escrow-release";

export function generateStaticParams() {
  return initialLessonConfirmations.map((l) => ({ id: l.id }));
}

export default async function AdminDisputeReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Not existence-checked server-side: disputes opened live from the Virtual
  // Classroom / student dashboard only exist in the client's shared
  // localStorage store, which the server can't see. The client component
  // does its own not-found check against the live store.
  return <AdminDisputeReviewClient disputeId={id} />;
}
