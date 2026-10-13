import { LessonConfirmationFullDetailsClient } from "@/components/admin/lesson-confirmation-full-details-client";

// No server-side existence gate here on purpose — Lesson Confirmations is a
// hybrid dataset (initialLessonConfirmations is static seed data, but
// escrow-store.ts's startLessonConfirmation also adds real confirmations at
// runtime as lessons actually happen), and the server has no access to that
// client-side localStorage data to check against. Gating only on the
// static seed here (as this route used to) is exactly what made a real,
// runtime-started lesson confirmation 404 on open — the same bug class
// fixed for /admin/reports/[reportId] and /admin/payments/payouts/[id].
// LessonConfirmationFullDetailsClient reads the same live store
// (useLessonConfirmations()) and now renders a proper fallback for a truly
// invalid id instead of a blank page.
export default async function AdminLessonConfirmationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LessonConfirmationFullDetailsClient lessonId={id} />;
}
