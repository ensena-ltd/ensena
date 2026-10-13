"use server";

import { getSupabaseServerClient } from "@/lib/supabase";

export interface NewsletterFormState {
  status: "idle" | "success" | "error" | "already-subscribed";
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeToNewsletter(
  _prevState: NewsletterFormState,
  formData: FormData
): Promise<NewsletterFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("newsletter_subscriptions")
      .insert({ email, status: "SUBSCRIBED" });

    if (error) {
      // Postgres unique_violation — email already has a row.
      if (error.code === "23505") {
        return { status: "already-subscribed", message: "This email is already subscribed." };
      }
      throw error;
    }

    return { status: "success", message: "You're subscribed! Look out for updates from Ensena." };
  } catch {
    return { status: "error", message: "We couldn't subscribe you right now. Please try again in a moment." };
  }
}
