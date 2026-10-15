import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminUserProfileClient } from "@/components/admin/admin-user-profile-client";
import { UserProfile } from "@/components/admin/real/user-profile";
import { loadAdminUser } from "@/lib/admin-people-bookings";
import { platformUsers } from "@/lib/admin-users-data";
import { getPlatformNowMs } from "@/lib/platform-time";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (isSupabaseConfigured()) return { title: "User | Ensena Admin" };
  const user = platformUsers.find((u) => u.id === id);
  return { title: user ? `${user.name} | Ensena Admin` : "User | Ensena Admin" };
}

export default async function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSupabaseConfigured()) {
    const user = await loadAdminUser(id);
    if (!user) notFound();
    return <UserProfile user={user} nowMs={getPlatformNowMs()} />;
  }
  return (
    <Suspense fallback={null}>
      <AdminUserProfileClient userId={id} />
    </Suspense>
  );
}
