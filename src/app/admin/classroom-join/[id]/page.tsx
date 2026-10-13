import { notFound } from "next/navigation";

import { AdminClassroomJoinClient } from "@/components/admin/admin-classroom-join-client";
import { initialGroupClasses } from "@/lib/admin-group-classes-data";

export function generateStaticParams() {
  return initialGroupClasses.map((c) => ({ id: c.id }));
}

export default async function AdminClassroomJoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const groupClass = initialGroupClasses.find((c) => c.id === id);
  if (!groupClass) notFound();

  return <AdminClassroomJoinClient groupClass={groupClass} />;
}
