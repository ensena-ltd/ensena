// Server-only: sign-ups from the two landing-page waitlists, for the admin
// Waitlist page. Both tables are insert-only for the public (RLS), so this
// reads them with the service role — only ever from admin pages, which the
// admin layout gates with requireRole("admin").
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";

export type WaitlistSource = "student" | "tutor";

export interface WaitlistSignup {
  id: string;
  source: WaitlistSource;
  name: string;
  email: string;
  /** Full international number, e.g. +2348012345678. */
  phone: string | null;
  /** Students only: their level, e.g. "SS2". */
  level: string | null;
  /** Students only: what they need help with. */
  needs: string[];
  /** Which landing page / campaign the sign-up came from. */
  campaign: string;
  createdAtMs: number;
}

export interface WaitlistData {
  signups: WaitlistSignup[];
  /** Set when a table couldn't be read (e.g. it doesn't exist in this project yet). */
  errors: string[];
}

export async function loadWaitlistSignups(): Promise<WaitlistData> {
  const admin = getServiceRoleClient();
  const [students, tutors] = await Promise.all([
    admin.from("student_waitlist_signups").select("id, first_name, email, whatsapp, level, needs, source, created_at").order("created_at", { ascending: false }),
    admin.from("tutor_circle_signups").select("id, full_name, email, phone, source, created_at").order("created_at", { ascending: false }),
  ]);

  const errors: string[] = [];
  if (students.error) errors.push(`Student waitlist: ${students.error.message}`);
  if (tutors.error) errors.push(`Tutor Circle: ${tutors.error.message}`);

  const studentRows = ((students.data ?? []) as { id: string; first_name: string; email: string; whatsapp: string | null; level: string; needs: string[] | null; source: string; created_at: string }[]).map(
    (r): WaitlistSignup => ({
      id: r.id,
      source: "student",
      name: r.first_name,
      email: r.email,
      phone: r.whatsapp,
      level: r.level,
      needs: r.needs ?? [],
      campaign: r.source,
      createdAtMs: new Date(r.created_at).getTime(),
    })
  );
  const tutorRows = ((tutors.data ?? []) as { id: string; full_name: string; email: string; phone: string | null; source: string; created_at: string }[]).map(
    (r): WaitlistSignup => ({
      id: r.id,
      source: "tutor",
      name: r.full_name,
      email: r.email,
      phone: r.phone,
      level: null,
      needs: [],
      campaign: r.source,
      createdAtMs: new Date(r.created_at).getTime(),
    })
  );

  return { signups: [...studentRows, ...tutorRows].sort((a, b) => b.createdAtMs - a.createdAtMs), errors };
}
