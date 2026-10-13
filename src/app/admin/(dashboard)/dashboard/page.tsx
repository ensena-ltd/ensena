import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { loadAdminDashboard } from "@/lib/admin-registrations";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

// Real numbers from Supabase (registrations, verification queue, bookings,
// activity); the demo dashboard when Supabase isn't set up.
export default async function AdminDashboardHomePage() {
  if (!isSupabaseConfigured()) return <AdminDashboardClient />;
  const profile = await requireRole("admin");
  const live = await loadAdminDashboard(profile?.fullName ?? "");
  return <AdminDashboardClient live={live} />;
}
