import { AdminGroupClassReviewClient } from "@/components/admin/admin-group-class-review-client";
import { initialGroupClasses } from "@/lib/admin-group-classes-data";

export function generateStaticParams() {
  return initialGroupClasses.map((c) => ({ id: c.id }));
}

export default async function AdminGroupClassReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminGroupClassReviewClient classId={id} />;
}
