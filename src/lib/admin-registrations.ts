// Server-side loaders for the admin dashboard's real (Supabase) data —
// everything people entered when they registered. Only import from Server
// Components / server actions under /admin (the admin layout's requireRole
// gate runs first).
//
// Reads go through the signed-in admin's own session, so Row Level Security
// still applies (private.is_admin / staff permissions). Sign-in details that
// only Supabase Auth holds (sign-up method, email confirmed, last sign-in)
// come from the service-role client — never sent to the browser as-is.
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeTutorStatus, parseTutorApplication, type TutorApplicationFields, type TutorApplicationStatus, type TutorDocType } from "@/lib/tutor-application";

export type AccountRole = "student" | "tutor" | "guardian" | "admin" | "counsellor";

export interface AdminAccountRow {
  id: string;
  role: AccountRole;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  avatarUrl: string | null;
  createdAt: string;
  signInMethods: string[];
  emailConfirmed: boolean;
  lastSignInAt: string | null;
}

export interface AdminTutorDocument {
  id: string;
  type: TutorDocType;
  fileName: string;
  storagePath: string;
  status: "submitted" | "approved" | "rejected";
  uploadedAt: string;
}

export interface AdminTutorRecord extends AdminAccountRow {
  status: TutorApplicationStatus;
  rejectionReason: string | null;
  resubmissionFields: string[];
  reviewedAt: string | null;
  submittedForReviewAt: string | null;
  application: TutorApplicationFields;
  documents: AdminTutorDocument[];
}

export interface AdminGuardianLink {
  fullName: string;
  relationship: string;
  email: string;
  phone: string;
  consentStatus: "pending" | "confirmed";
  consentRequestedAt: string | null;
  consentedAt: string | null;
  guardianAccountId: string | null;
}

export interface AdminStudentRecord extends AdminAccountRow {
  learningFor: string;
  academicLevel: string;
  academicDetail: string;
  course: string;
  subjects: string[];
  goal: string;
  onboarded: boolean;
  guardian: AdminGuardianLink | null;
}

export interface AdminGuardianRecord extends AdminAccountRow {
  children: { id: string; name: string; consentStatus: "pending" | "confirmed" }[];
}

type ProfileRow = {
  id: string;
  role: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  created_at: string;
};

async function authDetails(): Promise<Map<string, { methods: string[]; confirmed: boolean; lastSignInAt: string | null }>> {
  const map = new Map<string, { methods: string[]; confirmed: boolean; lastSignInAt: string | null }>();
  try {
    const admin = getServiceRoleClient();
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data) break;
      for (const u of data.users) {
        const providers = (u.app_metadata?.providers as string[] | undefined) ?? (u.app_metadata?.provider ? [u.app_metadata.provider as string] : []);
        map.set(u.id, {
          methods: providers.map((p) => (p === "email" ? "Email & password" : p === "google" ? "Google" : p)),
          confirmed: !!u.email_confirmed_at,
          lastSignInAt: u.last_sign_in_at ?? null,
        });
      }
      if (data.users.length < 1000) break;
    }
  } catch {
    // Service-role key missing — show the rest without sign-in details.
  }
  return map;
}

function toAccount(p: ProfileRow, auth: Map<string, { methods: string[]; confirmed: boolean; lastSignInAt: string | null }>): AdminAccountRow {
  const a = auth.get(p.id);
  return {
    id: p.id,
    role: (p.role as AccountRole) ?? "student",
    fullName: p.full_name?.trim() || p.email,
    email: p.email,
    phone: p.phone ?? "",
    dateOfBirth: p.date_of_birth ?? "",
    avatarUrl: p.avatar_url,
    createdAt: p.created_at,
    signInMethods: a?.methods ?? [],
    emailConfirmed: a?.confirmed ?? false,
    lastSignInAt: a?.lastSignInAt ?? null,
  };
}

const PROFILE_COLUMNS = "id, role, full_name, email, phone, date_of_birth, avatar_url, created_at";

export async function loadAccounts(): Promise<AdminAccountRow[]> {
  const supabase = await getSupabaseServerClient();
  const [{ data }, auth] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).order("created_at", { ascending: false }),
    authDetails(),
  ]);
  return ((data ?? []) as ProfileRow[]).map((p) => toAccount(p, auth));
}

type TutorRow = {
  id: string;
  phone: string | null;
  date_of_birth: string | null;
  application_status: string;
  application_data: Record<string, unknown> | null;
  rejection_reason: string | null;
  resubmission_fields: string[] | null;
  reviewed_at: string | null;
  submitted_for_review_at: string | null;
};

type DocRow = { id: string; tutor_id: string; doc_type: TutorDocType; file_name: string; storage_path: string; status: AdminTutorDocument["status"]; uploaded_at: string };

async function loadTutorsWhere(id?: string): Promise<AdminTutorRecord[]> {
  const supabase = await getSupabaseServerClient();
  let tutorQuery = supabase
    .from("tutor_profiles")
    .select("id, phone, date_of_birth, application_status, application_data, rejection_reason, resubmission_fields, reviewed_at, submitted_for_review_at");
  let docQuery = supabase.from("tutor_verification_documents").select("id, tutor_id, doc_type, file_name, storage_path, status, uploaded_at");
  if (id) {
    tutorQuery = tutorQuery.eq("id", id);
    docQuery = docQuery.eq("tutor_id", id);
  }
  const [{ data: tutors }, { data: docs }, auth] = await Promise.all([tutorQuery, docQuery, authDetails()]);
  const tutorRows = (tutors ?? []) as TutorRow[];
  if (tutorRows.length === 0) return [];
  const { data: profiles } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", tutorRows.map((t) => t.id));
  const docRows = (docs ?? []) as DocRow[];

  return tutorRows
    .flatMap((t) => {
      const p = (profiles as ProfileRow[] | null)?.find((x) => x.id === t.id);
      if (!p) return [];
      const account = toAccount(p, auth);
      return [
        {
          ...account,
          phone: account.phone || t.phone || "",
          dateOfBirth: account.dateOfBirth || t.date_of_birth || "",
          status: normalizeTutorStatus(t.application_status),
          rejectionReason: t.rejection_reason,
          resubmissionFields: t.resubmission_fields ?? [],
          reviewedAt: t.reviewed_at,
          submittedForReviewAt: t.submitted_for_review_at,
          application: parseTutorApplication(t.application_data),
          documents: docRows
            .filter((d) => d.tutor_id === t.id)
            .map((d) => ({ id: d.id, type: d.doc_type, fileName: d.file_name, storagePath: d.storage_path, status: d.status, uploadedAt: d.uploaded_at })),
        },
      ];
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function loadTutors() {
  return loadTutorsWhere();
}

export async function loadTutor(id: string): Promise<AdminTutorRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await loadTutorsWhere(id))[0] ?? null;
}

type StudentRow = {
  id: string;
  phone: string | null;
  date_of_birth: string | null;
  learning_for: string | null;
  academic_level: string | null;
  academic_detail: string | null;
  course: string | null;
  subjects: string[] | null;
  goal: string | null;
};

type GuardianRow = {
  student_id: string;
  full_name: string;
  relationship: string;
  email: string;
  phone: string;
  consent_status: string;
  consent_requested_at: string | null;
  consented_at: string | null;
  guardian_user_id: string | null;
};

async function loadStudentsWhere(id?: string): Promise<AdminStudentRecord[]> {
  const supabase = await getSupabaseServerClient();
  let profileQuery = supabase.from("profiles").select(PROFILE_COLUMNS).eq("role", "student").order("created_at", { ascending: false });
  let studentQuery = supabase.from("student_profiles").select("id, phone, date_of_birth, learning_for, academic_level, academic_detail, course, subjects, goal");
  let guardianQuery = supabase.from("student_guardians").select("student_id, full_name, relationship, email, phone, consent_status, consent_requested_at, consented_at, guardian_user_id");
  if (id) {
    profileQuery = profileQuery.eq("id", id);
    studentQuery = studentQuery.eq("id", id);
    guardianQuery = guardianQuery.eq("student_id", id);
  }
  const [{ data: profiles }, { data: students }, { data: guardians }, auth] = await Promise.all([profileQuery, studentQuery, guardianQuery, authDetails()]);

  return ((profiles ?? []) as ProfileRow[]).map((p) => {
    const s = (students as StudentRow[] | null)?.find((x) => x.id === p.id);
    const g = (guardians as GuardianRow[] | null)?.find((x) => x.student_id === p.id);
    const account = toAccount(p, auth);
    return {
      ...account,
      phone: account.phone || s?.phone || "",
      dateOfBirth: account.dateOfBirth || s?.date_of_birth || "",
      learningFor: s?.learning_for ?? "",
      academicLevel: s?.academic_level ?? "",
      academicDetail: s?.academic_detail ?? "",
      course: s?.course ?? "",
      subjects: s?.subjects ?? [],
      goal: s?.goal ?? "",
      onboarded: !!s && (s.subjects?.length ?? 0) > 0,
      guardian: g
        ? {
            fullName: g.full_name,
            relationship: g.relationship,
            email: g.email,
            phone: g.phone,
            consentStatus: g.consent_status === "confirmed" ? "confirmed" : "pending",
            consentRequestedAt: g.consent_requested_at,
            consentedAt: g.consented_at,
            guardianAccountId: g.guardian_user_id,
          }
        : null,
    };
  });
}

export function loadStudents() {
  return loadStudentsWhere();
}

export async function loadStudent(id: string): Promise<AdminStudentRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await loadStudentsWhere(id))[0] ?? null;
}

export async function loadGuardians(): Promise<AdminGuardianRecord[]> {
  const supabase = await getSupabaseServerClient();
  const [{ data: profiles }, { data: links }, auth] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("role", "guardian").order("created_at", { ascending: false }),
    supabase.from("student_guardians").select("student_id, guardian_user_id, consent_status"),
    authDetails(),
  ]);
  const studentIds = ((links ?? []) as { student_id: string }[]).map((l) => l.student_id);
  const { data: students } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", studentIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };
  return ((profiles ?? []) as ProfileRow[]).map((p) => ({
    ...toAccount(p, auth),
    children: ((links ?? []) as { student_id: string; guardian_user_id: string | null; consent_status: string }[])
      .filter((l) => l.guardian_user_id === p.id)
      .map((l) => {
        const s = (students as { id: string; full_name: string | null; email: string }[] | null)?.find((x) => x.id === l.student_id);
        return { id: l.student_id, name: s?.full_name || s?.email || "Student", consentStatus: l.consent_status === "confirmed" ? ("confirmed" as const) : ("pending" as const) };
      }),
  }));
}

// ---------------------------------------------------------------------------
// Admin dashboard (/admin/dashboard) — every number from the database.
// Bookings/classes/counselling tables are real too; they're simply empty
// until people start booking.
// ---------------------------------------------------------------------------

export interface DashboardPendingItem {
  label: string;
  count: number;
  caption: string;
  href: string;
  actionLabel: string;
  tone: "rose" | "orange" | "amber" | "blue";
}

export interface DashboardActivity {
  id: string;
  title: string;
  detail: string;
  at: string;
  tone: "success" | "info" | "purple" | "pink" | "gray";
}

export interface AdminDashboardLive {
  adminName: string;
  students: { total: number; newThisMonth: number; spark: number[] };
  tutors: { total: number; newThisMonth: number; spark: number[] };
  pending: { total: number; items: DashboardPendingItem[] };
  bookings: { total: number; upcoming: number; completed: number; cancelled: number; spark: number[] };
  growth: {
    month: { labels: string[]; students: number[]; tutors: number[] };
    year: { labels: string[]; students: number[]; tutors: number[] };
  };
  distribution: {
    byRole: { label: string; count: number; color: string }[];
    tutorsByCountry: { label: string; count: number; color: string }[];
  };
  activity: DashboardActivity[];
}

const PALETTE = ["#F80248", "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#14B8A6", "#64748B"];

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Registrations per day over the last `days` days (oldest first).
function dailyCounts(dates: string[], days: number): number[] {
  const today = new Date();
  const keys = Array.from({ length: days }, (_, i) => dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i), 12)));
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const iso of dates) {
    const k = iso.slice(0, 10);
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  return keys.map((k) => counts.get(k)!);
}

type DashPerson = { id: string; role: string; full_name: string | null; email: string; created_at: string };

export async function loadAdminDashboard(adminName: string): Promise<AdminDashboardLive> {
  const supabase = await getSupabaseServerClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const [
    { data: profiles },
    { data: tutors },
    { count: consentPending },
    { data: lessons },
    { data: enrollments },
    { data: discovery },
    { count: draftClasses },
    { count: counsellingToday },
    { data: audit },
    auth,
  ] = await Promise.all([
    supabase.from("profiles").select("id, role, full_name, email, created_at").order("created_at", { ascending: false }),
    supabase.from("tutor_profiles").select("id, application_status, application_data"),
    supabase.from("student_guardians").select("student_id", { count: "exact", head: true }).eq("consent_status", "pending"),
    supabase.from("private_lessons").select("status, created_at"),
    supabase.from("group_class_enrollments").select("status, enrolled_at"),
    supabase.from("discovery_sessions").select("status, created_at"),
    supabase.from("group_classes").select("id", { count: "exact", head: true }).eq("status", "Draft"),
    supabase.from("counselling_appointments").select("id", { count: "exact", head: true }).gte("scheduled_at", todayStart).lt("scheduled_at", tomorrowStart),
    supabase.from("audit_logs").select("id, action, entity_type, entity_id, metadata, created_at").order("created_at", { ascending: false }).limit(8),
    authDetails(),
  ]);

  const people = (profiles ?? []) as DashPerson[];
  const byRole = (r: string) => people.filter((p) => p.role === r);
  const students = byRole("student");
  const tutorPeople = byRole("tutor");
  const tutorRows = (tutors ?? []) as { id: string; application_status: string; application_data: Record<string, unknown> | null }[];
  const statusCount = (s: TutorApplicationStatus) => tutorRows.filter((t) => normalizeTutorStatus(t.application_status) === s).length;
  const unconfirmed = people.filter((p) => auth.has(p.id) && !auth.get(p.id)!.confirmed).length;

  // Bookings = private lessons + group class enrollments + discovery sessions.
  type B = { status: string; at: string };
  const bookings: B[] = [
    ...((lessons ?? []) as { status: string; created_at: string }[]).map((l) => ({ status: l.status, at: l.created_at })),
    ...((enrollments ?? []) as { status: string; enrolled_at: string }[]).map((e) => ({ status: e.status, at: e.enrolled_at })),
    ...((discovery ?? []) as { status: string; created_at: string }[]).map((d) => ({ status: d.status, at: d.created_at })),
  ];
  const upcoming = bookings.filter((b) => ["Upcoming", "Pending", "Scheduled", "Active", "Waitlisted"].includes(b.status)).length;
  const completed = bookings.filter((b) => b.status === "Completed").length;
  const cancelled = bookings.filter((b) => ["Cancelled", "NoShow"].includes(b.status)).length;

  // Growth: daily this month, monthly this year.
  const monthDays = Array.from({ length: now.getDate() }, (_, i) => new Date(now.getFullYear(), now.getMonth(), i + 1, 12));
  const perDay = (list: DashPerson[]) => monthDays.map((d) => list.filter((p) => p.created_at.slice(0, 10) === dayKey(d)).length);
  const months = Array.from({ length: now.getMonth() + 1 }, (_, i) => i);
  const perMonth = (list: DashPerson[]) =>
    months.map((m) =>
      list.filter((p) => {
        const d = new Date(p.created_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === m;
      }).length
    );

  // Distribution
  const roleLabels: [string, string][] = [["student", "Students"], ["tutor", "Tutors"], ["guardian", "Parents / Guardians"], ["admin", "Admins"], ["counsellor", "Counsellors"]];
  const countryCounts = new Map<string, number>();
  for (const t of tutorRows) {
    const c = parseTutorApplication(t.application_data).country || "Not set";
    countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
  }

  // Activity: sign-ups + admin/tutor actions from the audit log.
  const nameOf = (id: string) => {
    const p = people.find((x) => x.id === id);
    return p ? p.full_name?.trim() || p.email : "A user";
  };
  const roleWord: Record<string, string> = { student: "student", tutor: "tutor", guardian: "parent/guardian", admin: "admin", counsellor: "counsellor" };
  const auditTitles: Record<string, [string, DashboardActivity["tone"]]> = {
    tutor_application_approved: ["Tutor approved", "success"],
    tutor_application_rejected: ["Tutor application rejected", "gray"],
    tutor_application_resubmission_required: ["Resubmission requested", "info"],
    tutor_application_resubmitted: ["Tutor resubmitted application", "purple"],
    tutor_application_pending: ["Tutor moved back to review", "info"],
  };
  const signups: DashboardActivity[] = people.slice(0, 8).map((p) => ({
    id: `signup-${p.id}`,
    title: `New ${roleWord[p.role] ?? p.role} registered`,
    detail: `${p.full_name?.trim() || p.email} · ${p.email}`,
    at: p.created_at,
    tone: p.role === "tutor" ? "purple" : p.role === "guardian" ? "pink" : "success",
  }));
  const reviews: DashboardActivity[] = ((audit ?? []) as { id: string; action: string; entity_id: string; metadata: Record<string, unknown> | null; created_at: string }[]).map((a) => {
    const [title, tone] = auditTitles[a.action] ?? [a.action.replace(/_/g, " "), "gray"];
    const note = typeof a.metadata?.note === "string" && a.metadata.note ? ` — ${a.metadata.note}` : "";
    return { id: `audit-${a.id}`, title, detail: `${nameOf(a.entity_id)}${note}`, at: a.created_at, tone };
  });
  const activity = [...signups, ...reviews].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  const pendingItems: DashboardPendingItem[] = [
    { label: "Tutor Verifications", count: statusCount("pending"), caption: "awaiting review", href: "/admin/verification", actionLabel: "Review Now", tone: "rose" },
    { label: "Guardian Consent", count: consentPending ?? 0, caption: "awaiting a parent", href: "/admin/students", actionLabel: "View Students", tone: "amber" },
    { label: "Pending Accounts", count: unconfirmed, caption: "email not confirmed", href: "/admin/users", actionLabel: "View Users", tone: "orange" },
    { label: "Group Class Approvals", count: draftClasses ?? 0, caption: "awaiting approval", href: "/admin/group-classes", actionLabel: "Review Classes", tone: "blue" },
    { label: "Counselling Appointments", count: counsellingToday ?? 0, caption: "today", href: "/admin/counsellors", actionLabel: "View Schedule", tone: "blue" },
  ];

  return {
    adminName,
    students: { total: students.length, newThisMonth: students.filter((p) => p.created_at >= monthStart).length, spark: dailyCounts(students.map((p) => p.created_at), 10) },
    tutors: { total: tutorPeople.length, newThisMonth: tutorPeople.filter((p) => p.created_at >= monthStart).length, spark: dailyCounts(tutorPeople.map((p) => p.created_at), 10) },
    pending: { total: pendingItems.reduce((n, i) => n + i.count, 0), items: pendingItems },
    bookings: { total: bookings.length, upcoming, completed, cancelled, spark: dailyCounts(bookings.map((b) => b.at), 10) },
    growth: {
      month: { labels: monthDays.map((d) => String(d.getDate())), students: perDay(students), tutors: perDay(tutorPeople) },
      year: { labels: months.map((m) => new Date(2000, m, 1).toLocaleDateString("en-GB", { month: "short" })), students: perMonth(students), tutors: perMonth(tutorPeople) },
    },
    distribution: {
      byRole: roleLabels.map(([r, label], i) => ({ label, count: byRole(r).length, color: PALETTE[i] })).filter((d) => d.count > 0),
      tutorsByCountry: [...countryCounts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count], i) => ({ label, count, color: PALETTE[i % PALETTE.length] })),
    },
    activity,
  };
}
