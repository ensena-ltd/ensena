// Server-only: sends the one-time "Welcome to Ensena" email (from
// welcome@ensena.co) once a student or tutor has finished registering.
// Called from every place a registration completes — /auth/callback (email
// confirmation), the end of Google sign-up, and email sign-ups that get a
// session straight away (see sendMyWelcomeEmail in lib/actions/auth.ts).
// Safe to call repeatedly: it only sends for a confirmed student/tutor with
// a sub-profile, on an account under 7 days old (so existing users never
// get one), and marks app_metadata.welcome_email_sent_at so it goes once.
import { getSupabaseServerClient as getSupabaseServiceRoleClient } from "@/lib/supabase";
import { dashboardHrefByRole } from "@/lib/supabase/roles";
import { isResendConfigured, sendEmail, welcomeEmail } from "@/lib/resend";

const WELCOME_FROM = process.env.RESEND_WELCOME_FROM || "Ensena <welcome@ensena.co>";
const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function sendWelcomeEmailIfNew(userId: string, origin: string): Promise<string> {
  if (!isResendConfigured()) return "Resend not configured, skipped";

  const admin = getSupabaseServiceRoleClient();
  const { data: auth } = await admin.auth.admin.getUserById(userId);
  const user = auth?.user;
  if (!user?.email || !user.email_confirmed_at) return "email not confirmed yet, skipped";
  if (user.app_metadata?.welcome_email_sent_at) return "already sent, skipped";
  if (Date.now() - new Date(user.created_at).getTime() > NEW_ACCOUNT_WINDOW_MS) return "existing account, skipped";

  const { data: profile } = await admin.from("profiles").select("role, full_name").eq("id", userId).maybeSingle();
  const role = profile?.role as string | undefined;
  if (role !== "student" && role !== "tutor") return `role ${role ?? "unknown"}, skipped`;

  // Registration isn't finished until the sub-profile exists (Google
  // sign-ups create it on the details page / tutor wizard).
  const { data: subProfile } = await admin.from(role === "student" ? "student_profiles" : "tutor_profiles").select("id").eq("id", userId).maybeSingle();
  if (!subProfile) return "registration not finished, skipped";

  // Mark first so two near-simultaneous calls can't both send.
  await admin.auth.admin.updateUserById(userId, { app_metadata: { ...user.app_metadata, welcome_email_sent_at: Date.now() } });

  const sent = await sendEmail({
    to: user.email,
    from: WELCOME_FROM,
    ...welcomeEmail({ name: profile?.full_name ?? "", role, dashboardUrl: `${origin}${dashboardHrefByRole[role]}` }),
  });
  if (!sent.ok) {
    // Clear the mark so the next call can try again.
    await admin.auth.admin.updateUserById(userId, { app_metadata: { ...user.app_metadata, welcome_email_sent_at: null } });
    return `Resend rejected the email: ${sent.error}`;
  }
  return `sent (Resend id ${sent.id})`;
}
