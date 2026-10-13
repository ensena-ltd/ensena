import { AdminReportReviewClient } from "@/components/admin/admin-report-review-client";

// No server-side existence gate here on purpose: Reports & Issues is a
// hybrid dataset — initialReports (admin-reports-data.ts) is static seed
// data, but reports-store.ts's createReport() also adds real reports at
// runtime (e.g. from communication-safety violations, or a future
// Community report), and the server has no access to that client-side
// localStorage data to check against. Checking only the static seed here
// (as this route used to) is exactly what made real, runtime-created
// reports 404 on Review even though they appeared correctly in the list.
// AdminReportReviewClient reads the same live store the list page does
// (useReports()) and already renders its own "This report could not be
// found" fallback for a truly invalid id — same pattern as
// /admin/support/[id]/page.tsx for the equivalent hybrid Support data.
export default async function AdminReportReviewPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return <AdminReportReviewClient reportId={reportId} />;
}
