import { notFound } from "next/navigation";

import { GroupClassFullDetailsClient } from "@/components/admin/group-class-full-details-client";
import { initialGroupClasses } from "@/lib/admin-group-classes-data";

export function generateStaticParams() {
  return initialGroupClasses.map((c) => ({ id: c.id }));
}

export default async function AdminGroupClassDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const groupClass = initialGroupClasses.find((c) => c.id === id);
  if (!groupClass) notFound();

  return <GroupClassFullDetailsClient classId={id} />;
}
