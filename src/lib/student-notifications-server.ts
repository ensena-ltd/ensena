// Server-only: the signed-in student's in-app notifications
// (public.notifications), for the dashboard's bell dropdowns and the
// Notifications page. Rows are written by server actions across the app
// (bookings, messages, payments, support…) with a free-form `category`;
// displayCategory() folds those into the student-facing filter names.
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";

export interface StudentNotificationRow {
  id: string;
  /** Student-facing category, e.g. "Booking", "Assignment", "Message". */
  category: string;
  text: string;
  actionUrl: string | null;
  unread: boolean;
  createdAtMs: number;
}

const CATEGORY_ALIASES: Record<string, string> = {
  booking: "Booking",
  lesson: "Booking",
  reminder: "Booking",
  homework: "Assignment",
  assignment: "Assignment",
  message: "Message",
  payment: "Payment",
  wallet: "Payment",
  refund: "Payment",
  review: "Review",
  announcement: "Announcement",
  support: "Announcement",
  security: "Announcement",
  discovery: "Discovery",
  counselling: "Counselling",
  promotion: "Promotion",
  promo: "Promotion",
  achievement: "Achievement",
  milestone: "Achievement",
};

export function displayCategory(raw: string | null): string {
  const key = (raw ?? "").trim().toLowerCase();
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  return key ? key[0].toUpperCase() + key.slice(1) : "Announcement";
}

export async function loadStudentNotifications(studentId: string, limit = 50): Promise<StudentNotificationRow[]> {
  try {
    const { data } = await getServiceRoleClient()
      .from("notifications")
      .select("id, text, category, action_url, unread, created_at")
      .eq("user_id", studentId)
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(limit);
    return ((data ?? []) as { id: string; text: string; category: string | null; action_url: string | null; unread: boolean; created_at: string }[]).map((n) => ({
      id: n.id,
      category: displayCategory(n.category),
      text: n.text,
      actionUrl: n.action_url,
      unread: n.unread,
      createdAtMs: new Date(n.created_at).getTime(),
    }));
  } catch {
    return [];
  }
}
