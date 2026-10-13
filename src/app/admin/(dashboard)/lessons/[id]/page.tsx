import { LessonFullDetailsClient } from "@/components/admin/lesson-full-details-client";
import { initialBookings } from "@/lib/admin-bookings-data";

export function generateStaticParams() {
  return initialBookings.filter((b) => b.type !== "Counselling").map((b) => ({ id: b.id }));
}

// A real, completed lesson only ever exists as a runtime LessonConfirmation
// (escrow-store.ts, localStorage — unknowable to this server component), not
// as a row in the static initialBookings seed array. Gating on
// initialBookings here would 404 every real lesson before
// LessonFullDetailsClient ever gets a chance to find it via the live
// useLessonConfirmations merge — that client component is the one place
// that can actually resolve either kind of row, so it owns the "not found"
// decision now.
export default async function AdminLessonDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LessonFullDetailsClient lessonId={id} />;
}
