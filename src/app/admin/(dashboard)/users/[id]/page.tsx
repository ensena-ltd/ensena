import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminUserProfileClient } from "@/components/admin/admin-user-profile-client";
import { platformUsers } from "@/lib/admin-users-data";

export function generateStaticParams() {
  return platformUsers.map((u) => ({ id: u.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = platformUsers.find((u) => u.id === id);
  return { title: user ? `${user.name} | Ensena Admin` : "User | Ensena Admin" };
}

export default async function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <AdminUserProfileClient userId={id} />
    </Suspense>
  );
}
