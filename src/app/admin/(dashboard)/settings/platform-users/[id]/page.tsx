import { AdminPlatformUserProfileClient } from "@/components/admin/admin-platform-user-profile-client";
import { seedPlatformUsers } from "@/lib/admin-platform-users-data";

export function generateStaticParams() {
  return seedPlatformUsers.map((u) => ({ id: u.id }));
}

export default async function AdminPlatformUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Not existence-checked server-side: accounts created live via Accept
  // Invitation only exist in the client's shared localStorage store, which
  // the server can't see. The client component does its own not-found check.
  return <AdminPlatformUserProfileClient userId={id} />;
}
