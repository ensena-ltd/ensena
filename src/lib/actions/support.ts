"use server";

import { revalidatePath } from "next/cache";

import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import { notifyUser } from "@/lib/notifications";
import { isResendConfigured, sendEmail } from "@/lib/resend";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  SUPPORT_CONTEXT_CONFIG,
  SUPPORT_EMAIL,
  type RelatedRecordType,
  type SupportChannel,
  type SupportContext,
  type SupportPriority,
  type SupportSource,
  type SupportStatus,
  type SupportUserRole,
  type StoredAttachment,
} from "@/lib/support-data";
import { loadBennyChat, SUPPORT_BUCKET, type BennyChat } from "@/lib/support-server";
import { SITE_URL } from "@/lib/site-url";

// Every support write goes through here, using the service-role client only
// after working out who the caller is: a requester can open tickets and
// reply on their own; only admins can reply as staff, add internal notes,
// assign, or change status/priority.

const MAX_MESSAGE = 5000;
const MAX_ATTACHMENTS = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const STATUSES: SupportStatus[] = ["Open", "In Progress", "Waiting for User", "Resolved", "Closed"];
const PRIORITIES: SupportPriority[] = ["Low", "Normal", "High", "Urgent"];
const CHANNELS: SupportChannel[] = ["Phone", "WhatsApp", "In Person", "Email", "Other"];
const RELATED_TYPES: RelatedRecordType[] = ["booking", "group-class", "payout", "counselling", "restriction"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f-]{36}$/i;

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

interface Caller {
  id: string;
  name: string;
  email: string;
  role: string;
}

async function currentCaller(): Promise<Caller | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("full_name, email, role").eq("id", user.id).maybeSingle();
  if (!data) return null;
  return { id: user.id, name: data.full_name?.trim() || data.email || "Ensena user", email: data.email ?? user.email ?? "", role: data.role };
}

function supportRoleOf(role: string): SupportUserRole {
  return role === "tutor" ? "Tutor" : role === "admin" ? "Admin" : "Student";
}

function dashboardBase(role: SupportUserRole): string | null {
  return role === "Tutor" ? "/tutor-dashboard" : role === "Student" ? "/student-dashboard" : null;
}

function refresh() {
  revalidatePath("/admin/support", "layout");
  revalidatePath("/tutor-dashboard/support", "layout");
  revalidatePath("/student-dashboard/support", "layout");
}

function clean(text: unknown, max: number): string {
  return typeof text === "string" ? text.trim().slice(0, max) : "";
}

async function newCode(): Promise<string> {
  const admin = getServiceRoleClient();
  return generateUniqueReferenceCode("support", async (candidate) => {
    const { data } = await admin.from("support_requests").select("id").eq("code", candidate).maybeSingle();
    return Boolean(data);
  });
}

async function logActivity(requestId: string, actorName: string, action: string) {
  await getServiceRoleClient().from("support_activity").insert({ request_id: requestId, actor_name: actorName, action });
}

// Lets the support inbox know a new ticket arrived, when email is set up.
async function alertSupportInbox(code: string, subject: string, from: string, role: SupportUserRole, message: string) {
  if (!isResendConfigured()) return;
  const site = SITE_URL;
  const link = `${site}/admin/support/${code}`;
  const sent = await sendEmail({
    to: process.env.SUPPORT_INBOX_EMAIL || SUPPORT_EMAIL,
    subject: `[${code}] ${subject}`,
    text: `New support request from ${from} (${role}).\n\n${message}\n\nOpen it in Admin: ${link}`,
    html: `<p>New support request from <strong>${escapeHtml(from)}</strong> (${role}).</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p><p><a href="${link}">Open ${code} in Admin</a></p>`,
  });
  if (!sent.ok) console.error("[support] inbox alert failed:", sent.error);
}

function escapeHtml(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Tells the requester something happened on their ticket: an in-app
// notification + email/push per their settings for account holders, a
// plain email for guests.
async function tellRequester(
  request: { requester_id: string | null; requester_email: string | null; requester_name: string; requester_role: SupportUserRole; code: string },
  title: string,
  body: string
) {
  const base = dashboardBase(request.requester_role);
  const url = base ? `${base}/support/${request.code}` : undefined;
  if (request.requester_id) {
    await getServiceRoleClient().from("notifications").insert({ user_id: request.requester_id, category: "Support", text: body, action_url: url ?? null });
    await notifyUser(request.requester_id, { category: "reminder", title, body, url, ctaLabel: "View request" });
  } else if (request.requester_email && isResendConfigured()) {
    await sendEmail({
      to: request.requester_email,
      subject: title,
      text: `Hi ${request.requester_name.split(" ")[0] || "there"},\n\n${body}\n\nReply to this email or write to ${SUPPORT_EMAIL}, quoting ${request.code}.\n\n— The Ensena Team`,
      html: `<p>Hi ${escapeHtml(request.requester_name.split(" ")[0] || "there")},</p><p style="white-space:pre-wrap">${escapeHtml(body)}</p><p>Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>, quoting <strong>${request.code}</strong>.</p><p>— The Ensena Team</p>`,
      from: `Ensena Support <${SUPPORT_EMAIL}>`,
    });
  }
}

// ── Attachments ────────────────────────────────────────────────────────

// Hands out a one-time signed upload URL. Files land under the caller's
// own folder ("guest/<random>" for signed-out visitors), and a ticket or
// reply only accepts paths from that folder.
export async function createSupportUpload(input: { name: string; size: number; mimeType: string; guestKey?: string }): Promise<Result<{ path: string; token: string }>> {
  if (!input.name || input.size <= 0) return { ok: false, message: "That file is empty." };
  if (input.size > MAX_FILE_BYTES) return { ok: false, message: "Attachments must be 5MB or smaller." };
  const caller = await currentCaller();
  const owner = caller ? caller.id : input.guestKey && UUID.test(input.guestKey) ? `guest/${input.guestKey}` : null;
  if (!owner) return { ok: false, message: "We couldn't prepare that upload. Please refresh and try again." };
  const safeName = input.name.replace(/[^\w.\- ]+/g, "_").slice(-120) || "file";
  const path = `${owner}/${crypto.randomUUID()}/${safeName}`;
  const { data, error } = await getServiceRoleClient().storage.from(SUPPORT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: "We couldn't prepare that upload. Please try again." };
  return { ok: true, path: data.path, token: data.token };
}

async function checkAttachments(files: StoredAttachment[] | undefined, owner: string): Promise<Result<{ files: StoredAttachment[] }>> {
  const list = (files ?? []).slice(0, MAX_ATTACHMENTS);
  if (list.length === 0) return { ok: true, files: [] };
  for (const f of list) {
    if (!f.path.startsWith(`${owner}/`) || f.path.includes("..") || f.size > MAX_FILE_BYTES) return { ok: false, message: "One of the attachments can't be used." };
  }
  const { data } = await getServiceRoleClient().storage.from(SUPPORT_BUCKET).createSignedUrls(list.map((f) => f.path), 60);
  if (!data || data.some((d) => d.error || !d.signedUrl)) return { ok: false, message: "An attachment didn't finish uploading. Please try again." };
  return { ok: true, files: list.map((f) => ({ name: clean(f.name, 200) || "file", size: f.size, mimeType: clean(f.mimeType, 120), path: f.path })) };
}

// ── Opening a ticket ───────────────────────────────────────────────────

export interface SubmitTicketInput {
  context: SupportContext;
  category: string;
  message: string;
  source?: SupportSource;
  subject?: string;
  relatedRecordType?: RelatedRecordType;
  relatedRecordId?: string;
  relatedRecordLabel?: string;
  attachments?: StoredAttachment[];
  /** Signed-out visitors only. */
  guest?: { name: string; email: string; key?: string };
}

export async function submitSupportTicket(input: SubmitTicketInput): Promise<Result<{ id: string }>> {
  const caller = await currentCaller();
  const config = SUPPORT_CONTEXT_CONFIG[input.context];
  if (!config) return { ok: false, message: "Please choose what you need help with." };
  const category = clean(input.category, 120);
  if (!category) return { ok: false, message: "Please choose what you need help with." };
  const message = clean(input.message, MAX_MESSAGE);
  if (message.length < 5) return { ok: false, message: "Please describe your issue in a few words." };

  let requester: { id: string | null; name: string; email: string | null; role: SupportUserRole };
  let owner: string;
  if (caller) {
    requester = { id: caller.id, name: caller.name, email: caller.email || null, role: supportRoleOf(caller.role) };
    owner = caller.id;
  } else {
    const name = clean(input.guest?.name, 120);
    const email = clean(input.guest?.email, 200).toLowerCase();
    if (!name) return { ok: false, message: "Please tell us your name." };
    if (!EMAIL.test(email)) return { ok: false, message: "Please enter a valid email so we can reply to you." };
    requester = { id: null, name, email, role: "Guest" };
    owner = input.guest?.key && UUID.test(input.guest.key) ? `guest/${input.guest.key}` : "guest/none";
  }

  const checked = await checkAttachments(input.attachments, owner);
  if (!checked.ok) return checked;

  const source: SupportSource = input.source === "Report" ? "Report" : "Ticket";
  const relatedType = input.relatedRecordType && RELATED_TYPES.includes(input.relatedRecordType) ? input.relatedRecordType : null;
  const subject = clean(input.subject, 160) || category;
  // Technical problems and appeals go in a little higher so they're seen first.
  const priority: SupportPriority = source === "Report" || input.context === "technical" || relatedType === "restriction" ? "High" : "Normal";

  const admin = getServiceRoleClient();
  const code = await newCode();
  const { data: created, error } = await admin
    .from("support_requests")
    .insert({
      code,
      requester_id: requester.id,
      requester_name: requester.name,
      requester_email: requester.email,
      requester_role: requester.role,
      is_existing_user: requester.id ? true : null,
      context: input.context,
      category,
      subject,
      message,
      source,
      priority,
      related_record_type: relatedType,
      related_record_id: relatedType ? clean(input.relatedRecordId, 120) || null : null,
      related_record_label: relatedType ? clean(input.relatedRecordLabel, 200) || null : null,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: "We couldn't submit your request. Please try again." };

  await Promise.all([
    admin.from("support_messages").insert({ request_id: created.id, author: "user", author_id: requester.id, author_name: requester.name, body: message, attachments: checked.files }),
    logActivity(created.id, requester.name, source === "Report" ? "Issue reported" : "Request created via Ticket"),
  ]);
  await alertSupportInbox(code, subject, requester.name, requester.role, message);
  refresh();
  return { ok: true, id: code };
}

// ── Requester replies ──────────────────────────────────────────────────

export async function replyToSupportRequest(code: string, text: string, attachments?: StoredAttachment[]): Promise<Result> {
  const caller = await currentCaller();
  if (!caller) return { ok: false, message: "Please sign in again." };
  const body = clean(text, MAX_MESSAGE);
  if (!body && !attachments?.length) return { ok: false, message: "Write a message first." };
  const admin = getServiceRoleClient();
  const { data: request } = await admin.from("support_requests").select("id, status, requester_id").eq("code", code.toUpperCase()).maybeSingle();
  if (!request || request.requester_id !== caller.id) return { ok: false, message: "This support request could not be found." };
  if (request.status === "Closed") return { ok: false, message: "This request is closed. Please open a new one." };
  const checked = await checkAttachments(attachments, caller.id);
  if (!checked.ok) return checked;

  // A reply re-opens a resolved request, and answers a "waiting for you".
  const nextStatus: SupportStatus = request.status === "Waiting for User" || request.status === "Resolved" ? "In Progress" : request.status;
  await admin.from("support_messages").insert({ request_id: request.id, author: "user", author_id: caller.id, author_name: caller.name, body, attachments: checked.files });
  await admin.from("support_requests").update({ status: nextStatus, updated_at: new Date().toISOString(), resolved_at: nextStatus === "In Progress" ? null : undefined }).eq("id", request.id);
  await logActivity(request.id, caller.name, request.status === nextStatus ? "Requester replied" : `Requester replied · status changed from ${request.status} to ${nextStatus}`);
  refresh();
  return { ok: true };
}

// ── Admin ──────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<Caller | null> {
  const caller = await currentCaller();
  return caller && caller.role === "admin" ? caller : null;
}

async function loadForAdmin(code: string) {
  const { data } = await getServiceRoleClient()
    .from("support_requests")
    .select("id, code, status, priority, subject, source, assigned_to, assigned_name, requester_id, requester_email, requester_name, requester_role")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return data as
    | { id: string; code: string; status: SupportStatus; priority: SupportPriority; subject: string; source: SupportSource; assigned_to: string | null; assigned_name: string | null; requester_id: string | null; requester_email: string | null; requester_name: string; requester_role: SupportUserRole }
    | null;
}

export async function staffReplyToSupportRequest(code: string, text: string, opts: { internal?: boolean; attachments?: StoredAttachment[] } = {}): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { ok: false, message: "Only Ensena staff can do that." };
  const body = clean(text, MAX_MESSAGE);
  if (!body && !opts.attachments?.length) return { ok: false, message: "Write a message first." };
  const request = await loadForAdmin(code);
  if (!request) return { ok: false, message: "This support request could not be found." };
  const checked = await checkAttachments(opts.attachments, me.id);
  if (!checked.ok) return checked;

  const admin = getServiceRoleClient();
  await admin.from("support_messages").insert({ request_id: request.id, author: "staff", author_id: me.id, author_name: me.name, body, is_internal: Boolean(opts.internal), attachments: checked.files });
  // Answering an open ticket moves it into progress and claims it if nobody has.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (!opts.internal && request.status === "Open") patch.status = "In Progress";
  if (!opts.internal && !request.assigned_to) {
    patch.assigned_to = me.id;
    patch.assigned_name = me.name;
  }
  await admin.from("support_requests").update(patch).eq("id", request.id);
  await logActivity(request.id, me.name, opts.internal ? `${me.name} added an internal note` : `${me.name} sent a reply`);
  // In a live chat the person usually sees the reply in the widget, so only
  // notify them if they've gone quiet for 10 minutes (they've probably left).
  let notifyRequester = !opts.internal;
  if (notifyRequester && request.source === "Live Chat") {
    const { data: lastFromUser } = await admin.from("support_messages").select("created_at").eq("request_id", request.id).eq("author", "user").order("created_at", { ascending: false }).limit(1).maybeSingle();
    notifyRequester = !lastFromUser || Date.now() - new Date(lastFromUser.created_at).getTime() > 10 * 60_000;
  }
  if (notifyRequester) {
    await tellRequester(request, `Ensena Support replied to ${request.code}`, `${me.name} from Ensena Support replied to your request "${request.subject}": ${body.slice(0, 400)}${body.length > 400 ? "…" : ""}`);
  }
  refresh();
  return { ok: true };
}

export async function setSupportStatus(code: string, status: SupportStatus): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { ok: false, message: "Only Ensena staff can do that." };
  if (!STATUSES.includes(status)) return { ok: false, message: "Unknown status." };
  const request = await loadForAdmin(code);
  if (!request) return { ok: false, message: "This support request could not be found." };
  if (request.status === status) return { ok: true };
  const now = new Date().toISOString();
  await getServiceRoleClient()
    .from("support_requests")
    .update({ status, updated_at: now, resolved_at: status === "Resolved" || status === "Closed" ? now : null })
    .eq("id", request.id);
  await logActivity(request.id, me.name, `Status changed from ${request.status} to ${status}`);
  if (status === "Resolved") {
    await tellRequester(request, `Your support request ${request.code} was resolved`, `Your request "${request.subject}" has been marked as resolved. If it isn't fixed, just reply on the request and we'll pick it back up.`);
  } else if (status === "Waiting for User") {
    await tellRequester(request, `We need a bit more information on ${request.code}`, `Ensena Support is waiting for your reply on "${request.subject}". Please open the request and reply so we can continue.`);
  }
  refresh();
  return { ok: true };
}

export async function setSupportPriority(code: string, priority: SupportPriority): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { ok: false, message: "Only Ensena staff can do that." };
  if (!PRIORITIES.includes(priority)) return { ok: false, message: "Unknown priority." };
  const request = await loadForAdmin(code);
  if (!request) return { ok: false, message: "This support request could not be found." };
  if (request.priority === priority) return { ok: true };
  await getServiceRoleClient().from("support_requests").update({ priority, updated_at: new Date().toISOString() }).eq("id", request.id);
  await logActivity(request.id, me.name, `Priority changed from ${request.priority} to ${priority}`);
  refresh();
  return { ok: true };
}

export async function assignSupportRequestTo(code: string, staffId: string): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { ok: false, message: "Only Ensena staff can do that." };
  const request = await loadForAdmin(code);
  if (!request) return { ok: false, message: "This support request could not be found." };
  const admin = getServiceRoleClient();
  let assignee: { id: string; name: string } | null = null;
  if (staffId) {
    if (!UUID.test(staffId)) return { ok: false, message: "Choose a staff member." };
    const { data } = await admin.from("profiles").select("id, full_name, role").eq("id", staffId).maybeSingle();
    if (!data || data.role !== "admin") return { ok: false, message: "That person isn't on the Ensena team." };
    assignee = { id: data.id, name: data.full_name?.trim() || "Admin" };
  }
  if ((assignee?.id ?? null) === request.assigned_to) return { ok: true };
  await admin.from("support_requests").update({ assigned_to: assignee?.id ?? null, assigned_name: assignee?.name ?? null, updated_at: new Date().toISOString() }).eq("id", request.id);
  await logActivity(request.id, me.name, assignee ? `Assigned to ${assignee.name}` : "Unassigned");
  refresh();
  return { ok: true };
}

export interface ManualTicketInput {
  mode: "existing" | "external" | "self";
  requesterId?: string;
  externalName?: string;
  externalEmail?: string;
  externalPhone?: string;
  externalRole?: SupportUserRole;
  category: string;
  subject: string;
  message: string;
  channel?: SupportChannel;
  priority: SupportPriority;
  assignedStaffId?: string;
}

// A ticket typed in by staff for a caller (phone, WhatsApp, in person…) or
// for their own internal issue.
export async function fileManualSupportTicket(input: ManualTicketInput): Promise<Result<{ id: string }>> {
  const me = await requireAdmin();
  if (!me) return { ok: false, message: "Only Ensena staff can do that." };
  const admin = getServiceRoleClient();
  const subject = clean(input.subject, 160);
  const message = clean(input.message, MAX_MESSAGE);
  const category = clean(input.category, 120);
  if (!subject || !message || !category) return { ok: false, message: "Fill in the subject, category and description." };
  const priority = PRIORITIES.includes(input.priority) ? input.priority : "Normal";

  let requester: { id: string | null; name: string; email: string | null; phone: string | null; role: SupportUserRole; existing: boolean };
  if (input.mode === "self") {
    requester = { id: me.id, name: me.name, email: me.email || null, phone: null, role: "Admin", existing: true };
  } else if (input.mode === "existing") {
    if (!input.requesterId || !UUID.test(input.requesterId)) return { ok: false, message: "Choose who this ticket is for." };
    const { data } = await admin.from("profiles").select("id, full_name, email, role").eq("id", input.requesterId).maybeSingle();
    if (!data) return { ok: false, message: "That user couldn't be found." };
    requester = { id: data.id, name: data.full_name?.trim() || data.email || "Ensena user", email: data.email, phone: null, role: supportRoleOf(data.role), existing: true };
  } else {
    const name = clean(input.externalName, 120);
    if (!name) return { ok: false, message: "Enter the caller's name." };
    const email = clean(input.externalEmail, 200).toLowerCase();
    if (email && !EMAIL.test(email)) return { ok: false, message: "That email doesn't look right." };
    const role: SupportUserRole = input.externalRole && ["Guest", "Student", "Tutor"].includes(input.externalRole) ? input.externalRole : "Guest";
    requester = { id: null, name, email: email || null, phone: clean(input.externalPhone, 40) || null, role, existing: false };
  }

  const context: SupportContext = requester.role === "Student" ? "student" : requester.role === "Tutor" ? "tutor" : requester.role === "Admin" ? "platform-staff" : "public";
  const isManual = input.mode !== "self";
  const channel = isManual && input.channel && CHANNELS.includes(input.channel) ? input.channel : null;

  let assignee: { id: string; name: string } | null = null;
  if (input.assignedStaffId && UUID.test(input.assignedStaffId)) {
    const { data } = await admin.from("profiles").select("id, full_name, role").eq("id", input.assignedStaffId).maybeSingle();
    if (data?.role === "admin") assignee = { id: data.id, name: data.full_name?.trim() || "Admin" };
  }

  const code = await newCode();
  const { data: created, error } = await admin
    .from("support_requests")
    .insert({
      code,
      requester_id: requester.id,
      requester_name: requester.name,
      requester_email: requester.email,
      requester_phone: requester.phone,
      requester_role: requester.role,
      is_existing_user: requester.existing,
      context,
      category,
      subject,
      message,
      source: isManual ? "Manual" : "Ticket",
      channel,
      filed_by_id: isManual ? me.id : null,
      filed_by_name: isManual ? me.name : null,
      priority,
      assigned_to: assignee?.id ?? null,
      assigned_name: assignee?.name ?? null,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: "We couldn't create this ticket. Please try again." };

  await admin.from("support_messages").insert({ request_id: created.id, author: "user", author_id: requester.id, author_name: requester.name, body: message });
  await logActivity(created.id, me.name, isManual ? `Ticket filed manually: ${channel ?? "Other"} (filed by ${me.name})` : "Request created via Ticket");
  if (assignee) await logActivity(created.id, me.name, `Assigned to ${assignee.name}`);
  refresh();
  return { ok: true, id: code };
}

// ── Benny live chat ────────────────────────────────────────────────────
// Benny is the chat bubble on the site. Each conversation is a support
// request with source "Live Chat", so the team answers it from the same
// Admin → Support inbox, and the widget polls for their replies.

const MAX_CHAT_MESSAGE = 2000;

export async function fetchBennyChat(guestToken?: string): Promise<{ signedIn: boolean; name?: string; chat: BennyChat | null }> {
  const caller = await currentCaller();
  if (caller) return { signedIn: true, name: caller.name, chat: await loadBennyChat({ requesterId: caller.id }) };
  if (guestToken && UUID.test(guestToken)) return { signedIn: false, chat: await loadBennyChat({ guestToken }) };
  return { signedIn: false, chat: null };
}

export interface BennyMessageInput {
  text: string;
  attachments?: StoredAttachment[];
  /** Signed-out visitors: their browser key, plus name/email for the first message. */
  guestToken?: string;
  guestName?: string;
  guestEmail?: string;
  /** Page they were on, so the team has context. */
  page?: string;
}

export async function sendBennyMessage(input: BennyMessageInput): Promise<Result<{ chat: BennyChat | null }>> {
  const caller = await currentCaller();
  const text = clean(input.text, MAX_CHAT_MESSAGE);
  if (!text && !input.attachments?.length) return { ok: false, message: "Type a message first." };

  const guestToken = !caller && input.guestToken && UUID.test(input.guestToken) ? input.guestToken : null;
  if (!caller && !guestToken) return { ok: false, message: "Please refresh the page and try again." };
  const owner = caller ? caller.id : `guest/${guestToken}`;
  const checked = await checkAttachments(input.attachments, owner);
  if (!checked.ok) return checked;

  const admin = getServiceRoleClient();
  let query = admin
    .from("support_requests")
    .select("id, code, status, requester_name, updated_at")
    .eq("source", "Live Chat")
    .neq("status", "Closed")
    .order("created_at", { ascending: false })
    .limit(1);
  query = caller ? query.eq("requester_id", caller.id) : query.eq("guest_token", guestToken!).is("requester_id", null);
  const { data: active } = await query.maybeSingle();

  if (active) {
    // Slow down anyone sending faster than a person types.
    const { data: last } = await admin.from("support_messages").select("created_at").eq("request_id", active.id).eq("author", "user").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (last && Date.now() - new Date(last.created_at).getTime() < 1_000) return { ok: false, message: "You're sending messages too quickly. Please wait a moment." };

    const nextStatus: SupportStatus = active.status === "Waiting for User" || active.status === "Resolved" ? "In Progress" : active.status;
    await admin.from("support_messages").insert({ request_id: active.id, author: "user", author_id: caller?.id ?? null, author_name: caller?.name ?? active.requester_name, body: text, attachments: checked.files });
    await admin.from("support_requests").update({ status: nextStatus, updated_at: new Date().toISOString(), resolved_at: nextStatus === "In Progress" ? null : undefined }).eq("id", active.id);
    if (nextStatus !== active.status) await logActivity(active.id, caller?.name ?? active.requester_name, `Requester replied in live chat · status changed from ${active.status} to ${nextStatus}`);
    refresh();
    return { ok: true, chat: await loadBennyChat(caller ? { requesterId: caller.id } : { guestToken: guestToken! }) };
  }

  // First message: open a new live-chat request.
  let requester: { id: string | null; name: string; email: string | null; role: SupportUserRole };
  if (caller) {
    requester = { id: caller.id, name: caller.name, email: caller.email || null, role: supportRoleOf(caller.role) };
  } else {
    const name = clean(input.guestName, 120);
    const email = clean(input.guestEmail, 200).toLowerCase();
    if (!name) return { ok: false, message: "Please tell us your name." };
    if (!EMAIL.test(email)) return { ok: false, message: "Please enter a valid email so we can reply if you leave." };
    requester = { id: null, name, email, role: "Guest" };
  }
  const context: SupportContext = requester.role === "Tutor" ? "tutor" : requester.role === "Student" ? "student" : requester.role === "Admin" ? "platform-staff" : "public";
  const page = clean(input.page, 200);
  const code = await newCode();
  const { data: created, error } = await admin
    .from("support_requests")
    .insert({
      code,
      requester_id: requester.id,
      requester_name: requester.name,
      requester_email: requester.email,
      requester_role: requester.role,
      is_existing_user: requester.id ? true : null,
      context,
      category: "Live chat",
      subject: (text || "Attachment").slice(0, 80) + ((text?.length ?? 0) > 80 ? "…" : ""),
      message: text || "(attachment)",
      source: "Live Chat",
      priority: "Normal",
      guest_token: requester.id ? null : guestToken,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: "We couldn't start the chat. Please try again." };

  await admin.from("support_messages").insert({ request_id: created.id, author: "user", author_id: requester.id, author_name: requester.name, body: text, attachments: checked.files });
  await logActivity(created.id, requester.name, `Live chat started${page ? ` on ${page}` : ""}`);
  await alertSupportInbox(code, `Live chat: ${text.slice(0, 80) || "attachment"}`, requester.name, requester.role, text);
  refresh();
  return { ok: true, chat: await loadBennyChat(caller ? { requesterId: caller.id } : { guestToken: guestToken! }) };
}
