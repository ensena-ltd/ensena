import { AdminGroupClassPromoteClient } from "@/components/admin/admin-group-class-promote-client";
import { initialGroupClasses } from "@/lib/admin-group-classes-data";

export function generateStaticParams() {
  return initialGroupClasses.map((c) => ({ id: c.id }));
}

export default async function AdminGroupClassPromotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminGroupClassPromoteClient classId={id} />;
}
