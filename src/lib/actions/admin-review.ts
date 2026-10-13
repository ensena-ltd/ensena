"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { TutorApplicationStatus } from "@/lib/tutor-application";

// Admin tutor-verification actions. Authorization is enforced by the
// database: the review RPC checks private.is_admin / the
// tutor_verification.approve permission, and document updates / signed URLs
// go through RLS + storage policies for reviewers.

export interface AdminActionResult {
  ok: boolean;
  message?: string;
}

export async function reviewTutorApplication(input: {
  tutorId: string;
  status: TutorApplicationStatus;
  note?: string;
  fields?: string[];
}): Promise<AdminActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_tutor_application_status", {
    target_id: input.tutorId,
    new_status: input.status,
    note: input.note?.trim() || null,
    fields: input.fields ?? [],
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/verification");
  revalidatePath(`/admin/verification/${input.tutorId}`);
  revalidatePath("/admin/tutors");
  revalidatePath(`/admin/tutors/${input.tutorId}`);
  return { ok: true };
}

export async function setTutorDocumentStatus(input: { documentId: string; tutorId: string; status: "approved" | "rejected" | "submitted" }): Promise<AdminActionResult> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tutor_verification_documents")
    .update({ status: input.status, reviewed_at: input.status === "submitted" ? null : new Date().toISOString() })
    .eq("id", input.documentId)
    .select("id");
  if (error || !data?.length) return { ok: false, message: error?.message ?? "You don't have permission to review documents." };
  revalidatePath(`/admin/verification/${input.tutorId}`);
  revalidatePath(`/admin/tutors/${input.tutorId}`);
  return { ok: true };
}

export async function getTutorDocumentUrl(storagePath: string): Promise<{ url: string | null; message?: string }> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.storage.from("tutor-documents").createSignedUrl(storagePath, 60 * 10);
  if (error || !data) return { url: null, message: "You don't have access to this document." };
  return { url: data.signedUrl };
}
