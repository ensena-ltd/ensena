import { AdminPayoutReviewClient } from "@/components/admin/admin-payout-review-client";

// No server-side existence gate here on purpose — Payouts is a hybrid
// dataset (initialPayoutRequests is static seed data, but payout-store.ts's
// requestPayout() also adds real payout requests at runtime), and the
// server has no access to that client-side localStorage data to check
// against. Gating only on the static seed here (as this route used to) is
// exactly what made a real, runtime-requested payout 404 on Review even
// though it appeared correctly in the list — the same bug class fixed for
// /admin/reports/[reportId]. AdminPayoutReviewClient reads the same live
// store the list page does (usePayoutRequests()) and already renders its
// own "This payout request could not be found" fallback for a truly
// invalid id.
export default async function AdminPayoutReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminPayoutReviewClient payoutId={id} />;
}
