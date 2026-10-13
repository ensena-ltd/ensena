import type { Metadata } from "next";

import { AdminSupportDetailClient } from "@/components/admin/admin-support-detail-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { loadSupportRequestForAdmin, loadSupportStaff } from "@/lib/support-server";

export const metadata: Metadata = {
  title: "Support Request | Ensena Admin",
};

export default async function AdminSupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = isSupabaseConfigured() ? await requireRole("admin") : null;
  if (!profile) return <AdminSupportDetailClient id={id} />;
  const [found, staff] = await Promise.all([/^[A-Z0-9]{4,16}$/i.test(id) ? loadSupportRequestForAdmin(id) : null, loadSupportStaff()]);
  return <AdminSupportDetailClient id={id.toUpperCase()} live={{ request: found?.request ?? null, extras: found?.extras ?? {}, staff }} />;
}
