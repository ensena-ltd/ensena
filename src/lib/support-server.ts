// Server-only: reads support requests from the database and shapes them
// into the same SupportRequest type the existing support screens render.
// Everything is read with the service-role client and filtered here — a
// requester only ever gets their own requests (and never internal notes);
// the admin loaders are only called from pages behind requireRole("admin").
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import type {
  RelatedRecordType,
  SupportActivityEntry,
  SupportAttachment,
  SupportChannel,
  SupportContext,
  SupportMessage,
  SupportPriority,
  SupportRequest,
  SupportSource,
  SupportStatus,
  SupportUserRole,
  StoredAttachment,
} from "@/lib/support-data";

export type { StoredAttachment };

export const SUPPORT_BUCKET = "support-attachments";
const SIGNED_URL_SECONDS = 60 * 60;

const REQUEST_COLUMNS =
  "id, code, requester_id, requester_name, requester_email, requester_phone, requester_role, is_existing_user, context, category, subcategory, subject, message, source, channel, filed_by_name, status, priority, assigned_to, assigned_name, related_record_type, related_record_id, related_record_label, created_at, updated_at";

interface RequestRow {
  id: string;
  code: string;
  requester_id: string | null;
  requester_name: string;
  requester_email: string | null;
  requester_phone: string | null;
  requester_role: SupportUserRole;
  is_existing_user: boolean | null;
  context: SupportContext;
  category: string;
  subcategory: string | null;
  subject: string;
  message: string;
  source: SupportSource;
  channel: SupportChannel | null;
  filed_by_name: string | null;
  status: SupportStatus;
  priority: SupportPriority;
  assigned_to: string | null;
  assigned_name: string | null;
  related_record_type: RelatedRecordType | null;
  related_record_id: string | null;
  related_record_label: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  request_id: string;
  author: "user" | "staff";
  author_name: string;
  body: string;
  is_internal: boolean;
  attachments: StoredAttachment[] | null;
  created_at: string;
}

interface ActivityRow {
  id: string;
  request_id: string;
  actor_name: string;
  action: string;
  created_at: string;
}

export function formatFileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function toRequest(row: RequestRow, conversation: SupportMessage[] = [], activity: SupportActivityEntry[] = []): SupportRequest {
  return {
    id: row.code,
    userName: row.requester_name,
    userEmail: row.requester_email ?? undefined,
    userPhone: row.requester_phone ?? undefined,
    userRole: row.requester_role,
    isExistingUser: row.is_existing_user ?? undefined,
    context: row.context,
    category: row.category,
    subcategory: row.subcategory ?? undefined,
    source: row.source,
    channel: row.channel ?? undefined,
    filedByStaffName: row.filed_by_name ?? undefined,
    subject: row.subject,
    message: row.message,
    status: row.status,
    priority: row.priority,
    createdAtISO: row.created_at,
    updatedAtISO: row.updated_at,
    relatedRecordType: row.related_record_type ?? undefined,
    relatedRecordId: row.related_record_id ?? undefined,
    relatedRecordLabel: row.related_record_label ?? undefined,
    assignedStaff: row.assigned_name ?? undefined,
    conversation,
    activity,
  };
}

// Messages + activity for one request, with every attachment given a
// short-lived signed link (the bucket is private).
async function loadThread(row: RequestRow, includeInternal: boolean): Promise<SupportRequest> {
  const admin = getServiceRoleClient();
  let messagesQuery = admin
    .from("support_messages")
    .select("id, request_id, author, author_name, body, is_internal, attachments, created_at")
    .eq("request_id", row.id)
    .order("created_at", { ascending: true });
  if (!includeInternal) messagesQuery = messagesQuery.eq("is_internal", false);

  const [{ data: messageRows }, { data: activityRows }] = await Promise.all([
    messagesQuery,
    includeInternal
      ? admin.from("support_activity").select("id, request_id, actor_name, action, created_at").eq("request_id", row.id).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as ActivityRow[] }),
  ]);

  const messages = (messageRows ?? []) as MessageRow[];
  const paths = messages.flatMap((m) => (m.attachments ?? []).map((a) => a.path));
  const { data: signed } = paths.length ? await admin.storage.from(SUPPORT_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS) : { data: [] };
  const urlByPath = new Map((signed ?? []).filter((s) => s.path && s.signedUrl).map((s) => [s.path as string, s.signedUrl]));

  const conversation: SupportMessage[] = messages.map((m) => ({
    id: m.id,
    author: m.author,
    authorName: m.author_name,
    text: m.body,
    atISO: m.created_at,
    isInternal: m.is_internal || undefined,
    attachments: (m.attachments ?? []).length
      ? (m.attachments ?? []).map((a): SupportAttachment => ({ name: a.name, size: formatFileSize(a.size), dataUrl: urlByPath.get(a.path) ?? "" }))
      : undefined,
  }));

  const activity: SupportActivityEntry[] = ((activityRows ?? []) as ActivityRow[]).map((a) => ({ id: a.id, actorName: a.actor_name, action: a.action, atISO: a.created_at }));
  return toRequest(row, conversation, activity);
}

// ── Requester side ─────────────────────────────────────────────────────

export async function loadSupportRequestsForUser(userId: string): Promise<SupportRequest[]> {
  const { data } = await getServiceRoleClient()
    .from("support_requests")
    .select(REQUEST_COLUMNS)
    .eq("requester_id", userId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as RequestRow[]).map((r) => toRequest(r));
}

export async function loadSupportRequestForUser(userId: string, code: string): Promise<SupportRequest | null> {
  const { data } = await getServiceRoleClient()
    .from("support_requests")
    .select(REQUEST_COLUMNS)
    .eq("code", code.toUpperCase())
    .eq("requester_id", userId)
    .maybeSingle();
  return data ? loadThread(data as RequestRow, false) : null;
}

// ── Admin side ─────────────────────────────────────────────────────────

export async function loadAllSupportRequests(): Promise<SupportRequest[]> {
  const { data } = await getServiceRoleClient()
    .from("support_requests")
    .select(REQUEST_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(2000);
  return ((data ?? []) as RequestRow[]).map((r) => toRequest(r));
}

export interface AdminSupportExtras {
  requesterId?: string;
  requesterAccountStatus?: string;
  requesterProfileHref?: string;
}

export async function loadSupportRequestForAdmin(code: string): Promise<{ request: SupportRequest; extras: AdminSupportExtras } | null> {
  const admin = getServiceRoleClient();
  const { data } = await admin.from("support_requests").select(REQUEST_COLUMNS).eq("code", code.toUpperCase()).maybeSingle();
  if (!data) return null;
  const row = data as RequestRow;
  const request = await loadThread(row, true);

  const extras: AdminSupportExtras = {};
  if (row.requester_id) {
    extras.requesterId = row.requester_id;
    const { data: person } = await admin.from("profiles").select("role").eq("id", row.requester_id).maybeSingle();
    if (person?.role === "tutor") {
      const { data: tutor } = await admin.from("tutor_profiles").select("application_status").eq("id", row.requester_id).maybeSingle();
      extras.requesterAccountStatus = (tutor?.application_status as string | undefined) ?? "Tutor";
      extras.requesterProfileHref = `/admin/tutors/${row.requester_id}`;
    } else if (person?.role === "student") {
      extras.requesterAccountStatus = "Active";
      extras.requesterProfileHref = `/admin/students/${row.requester_id}`;
    } else if (person?.role === "admin") {
      extras.requesterAccountStatus = "Staff";
    }
  }
  return { request, extras };
}

export interface SupportStaffOption {
  id: string;
  name: string;
  role: string;
}

// Everyone with an admin account, labelled with their staff role (no
// staff-role row = the owner account, i.e. Super Admin).
export async function loadSupportStaff(): Promise<SupportStaffOption[]> {
  const admin = getServiceRoleClient();
  const [{ data: people }, { data: assignments }, { data: roles }] = await Promise.all([
    admin.from("profiles").select("id, full_name").eq("role", "admin"),
    admin.from("user_staff_roles").select("user_id, role_id"),
    admin.from("staff_roles").select("id, name"),
  ]);
  const roleName = new Map(((roles ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]));
  const roleByUser = new Map(((assignments ?? []) as { user_id: string; role_id: string }[]).map((a) => [a.user_id, roleName.get(a.role_id) ?? "Staff"]));
  return ((people ?? []) as { id: string; full_name: string | null }[])
    .map((p) => ({ id: p.id, name: p.full_name?.trim() || "Admin", role: roleByUser.get(p.id) ?? "Super Admin" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// For the admin "New Ticket" form's "Existing Enseña user" search.
export interface SupportDirectoryEntry {
  id: string;
  name: string;
  email: string;
  role: SupportUserRole;
}

export async function loadSupportDirectory(): Promise<SupportDirectoryEntry[]> {
  const { data } = await getServiceRoleClient()
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["student", "tutor", "guardian"])
    .order("full_name")
    .limit(5000);
  return ((data ?? []) as { id: string; full_name: string | null; email: string | null; role: string }[]).map((p) => ({
    id: p.id,
    name: p.full_name?.trim() || p.email || "Unnamed user",
    email: p.email ?? "",
    role: p.role === "tutor" ? "Tutor" : "Student",
  }));
}

// ── Benny live chat ────────────────────────────────────────────────────

export interface BennyChatMessage {
  id: string;
  author: "user" | "staff";
  authorName: string;
  text: string;
  atISO: string;
  attachments?: SupportAttachment[];
}

export interface BennyChat {
  code: string;
  status: SupportStatus;
  messages: BennyChatMessage[];
}

// The person's current live chat (the newest one that isn't closed), for
// either a signed-in user or a guest's browser key. Never includes staff
// internal notes.
export async function loadBennyChat(owner: { requesterId: string } | { guestToken: string }): Promise<BennyChat | null> {
  let query = getServiceRoleClient()
    .from("support_requests")
    .select(REQUEST_COLUMNS)
    .eq("source", "Live Chat")
    .neq("status", "Closed")
    .order("created_at", { ascending: false })
    .limit(1);
  query = "requesterId" in owner ? query.eq("requester_id", owner.requesterId) : query.eq("guest_token", owner.guestToken).is("requester_id", null);
  const { data } = await query.maybeSingle();
  if (!data) return null;
  const request = await loadThread(data as RequestRow, false);
  return {
    code: request.id,
    status: request.status,
    messages: request.conversation.map((m) => ({ id: m.id, author: m.author, authorName: m.authorName, text: m.text, atISO: m.atISO, attachments: m.attachments })),
  };
}
