"use server";

import { getSupabaseServerClient } from "@/lib/supabase";

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "role" | "category" | "subject" | "message", string>>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContactMessage(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const fieldErrors: ContactFormState["fieldErrors"] = {};
  if (!name) fieldErrors.name = "Please enter your name.";
  if (!email || !EMAIL_RE.test(email)) fieldErrors.email = "Please enter a valid email address.";
  if (!role) fieldErrors.role = "Please tell us who you are.";
  if (!category) fieldErrors.category = "Please choose a reason for contacting us.";
  if (!subject) fieldErrors.subject = "Please add a subject.";
  if (!message) fieldErrors.message = "Please write a message.";

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, message: "Please fix the highlighted fields." };
  }

  try {
    const supabase = getSupabaseServerClient();
    // No real session system exists yet in this app (see src/lib/demo-auth.ts —
    // sign-in never sets a cookie/session), so there is no way to know who is
    // "logged in" server-side. user_id stays null until real auth is wired up.
    const { error } = await supabase.from("contact_messages").insert({
      user_id: null,
      name,
      email,
      role,
      category,
      subject,
      message,
    });

    if (error) throw error;

    return { status: "success", message: "Thanks for contacting Ensena. We've received your message." };
  } catch {
    return {
      status: "error",
      message: "We couldn't send your message right now. Please try again in a moment.",
    };
  }
}
