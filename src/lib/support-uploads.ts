"use client";

import { createSupportUpload } from "@/lib/actions/support";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { StoredAttachment } from "@/lib/support-data";

const BUCKET = "support-attachments";

// Uploads ticket/reply attachments straight to the private support bucket
// through one-time signed upload URLs, returning what the support actions
// expect. Throws with a readable message if any file fails.
export async function uploadSupportFiles(files: File[], guestKey?: string): Promise<StoredAttachment[]> {
  const supabase = getSupabaseBrowserClient();
  const uploaded: StoredAttachment[] = [];
  for (const file of files) {
    const ticket = await createSupportUpload({ name: file.name, size: file.size, mimeType: file.type, guestKey });
    if (!ticket.ok) throw new Error(ticket.message);
    const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type || "application/octet-stream" });
    if (error) throw new Error(`${file.name} couldn't be uploaded. Please try again.`);
    uploaded.push({ name: file.name, size: file.size, mimeType: file.type, path: ticket.path });
  }
  return uploaded;
}
