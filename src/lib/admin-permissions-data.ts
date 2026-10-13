// Admin -> Settings -> Permissions, and the backbone of the Platform Users
// (Team Management) system. A role-based access model so staff can do their
// jobs without automatically seeing sensitive information or gaining
// financial/admin control. Super Admin is always full-access and not
// editable — every other role's grid is a real, toggleable default.
//
// Two tiers, deliberately kept separate:
//  - sectionAccessByRole: coarse, page-level nav access (can this role even
//    open /admin/payments at all?) — drives the sidebar and the route guard.
//  - initialPermissionMatrix: granular, action-level access within a page a
//    role CAN open (e.g. can they click "Approve Payout", or just view it?).
export type AdminRole =
  | "Super Admin"
  | "Platform Admin"
  | "Customer Support"
  | "Student Support"
  | "Tutor Support"
  | "Finance"
  | "Counsellor"
  | "Content Manager"
  | "Communications Manager"
  | "Custom";

export const adminRoles: AdminRole[] = [
  "Super Admin",
  "Platform Admin",
  "Customer Support",
  "Student Support",
  "Tutor Support",
  "Finance",
  "Counsellor",
  "Content Manager",
  "Communications Manager",
];

// Roles a Super Admin can actually invite someone into (Super Admin itself
// is never assigned via invitation — it's the owner-level account).
export const invitableRoles: AdminRole[] = [...adminRoles.filter((r) => r !== "Super Admin"), "Custom"];

export interface SectionDef {
  key: string;
  label: string;
  href: string;
}

// Mirrors the admin sidebar's top-level items — the single source of truth
// both the sidebar and the route guard read from, so a role that can't see
// a nav item also can't reach it by typing the URL directly.
export const allSections: SectionDef[] = [
  { key: "Dashboard", label: "Dashboard", href: "/admin/dashboard" },
  { key: "Users", label: "Users", href: "/admin/users" },
  { key: "TutorVerification", label: "Tutor Verification", href: "/admin/verification" },
  { key: "GroupClasses", label: "Group Classes", href: "/admin/group-classes" },
  { key: "Bookings", label: "Bookings", href: "/admin/bookings" },
  { key: "Counselling", label: "Counselling", href: "/admin/counsellors" },
  { key: "Payments", label: "Payments & Earnings", href: "/admin/payments" },
  { key: "Disputes", label: "Disputes", href: "/admin/disputes" },
  { key: "Reports", label: "Reports & Issues", href: "/admin/reports" },
  { key: "Support", label: "Support", href: "/admin/support" },
  { key: "Reviews", label: "Reviews", href: "/admin/reviews" },
  { key: "Communications", label: "Communications", href: "/admin/communications" },
  { key: "Analytics", label: "Analytics", href: "/admin/analytics" },
  { key: "PlatformManagement", label: "Platform Management", href: "/admin/platform-management" },
  { key: "KnowledgeBase", label: "Knowledge Base", href: "/admin/knowledge-base" },
  { key: "Settings", label: "Settings", href: "/admin/settings" },
  { key: "Help", label: "Help Center", href: "/admin/help" },
];

// "Help" is granted to every role unconditionally (like Dashboard) — it's
// internal documentation plus a way to file your own support escalation,
// never a sensitive area, so there's no reason to gate it per-role.
export const sectionAccessByRole: Record<Exclude<AdminRole, "Custom">, string[]> = {
  "Super Admin": allSections.map((s) => s.key),
  "Platform Admin": ["Dashboard", "Users", "TutorVerification", "GroupClasses", "Bookings", "Reports", "Support", "Reviews", "Communications", "Analytics", "PlatformManagement", "KnowledgeBase", "Help"],
  "Customer Support": ["Dashboard", "Users", "Bookings", "Reports", "Support", "Reviews", "Communications", "Help"],
  "Student Support": ["Dashboard", "Users", "Bookings", "Communications", "Reports", "Support", "Reviews", "Help"],
  "Tutor Support": ["Dashboard", "Users", "TutorVerification", "GroupClasses", "Bookings", "Communications", "Support", "Help"],
  Finance: ["Dashboard", "Bookings", "Payments", "Disputes", "Help"],
  Counsellor: ["Dashboard", "Counselling", "Help"],
  "Content Manager": ["Dashboard", "PlatformManagement", "KnowledgeBase", "Help"],
  "Communications Manager": ["Dashboard", "Communications", "Help"],
};

export const roleDescriptions: Record<AdminRole, { summary: string; can: string[]; cannot: string[] }> = {
  "Super Admin": {
    summary: "Full platform access: the owner-level account.",
    can: ["Manage Platform Users", "Change permissions", "View all users", "Manage payments", "Approve tutors", "Approve classes", "Manage counselling", "Ban/restrict users", "Change platform settings", "View complete audit logs"],
    cannot: [],
  },
  "Platform Admin": {
    summary: "Broad operational access across the platform.",
    can: ["Dashboard", "Users", "Tutor Verification", "Group Classes", "Bookings", "Reports", "Support", "Reviews", "Communications", "Analytics", "Platform Management"],
    cannot: ["Manage admin permissions", "Financial configuration", "Super Admin management", "Manage Platform Users"],
  },
  "Customer Support": {
    summary: "General support across students and tutors.",
    can: ["Dashboard", "Basic Users", "Students", "Tutors", "Bookings", "Reports & Issues", "Support requests", "Reviews", "Communications"],
    cannot: ["Tutor payouts", "Financial configuration", "Commission settings", "Private counselling notes", "Admin permissions", "Platform settings", "Audit log management"],
  },
  "Student Support": {
    summary: "Focused on student-side platform issues.",
    can: ["Students", "Student bookings", "Student classes", "Relevant communications", "Reports & Issues", "Support requests", "Reviews"],
    cannot: ["Tutor earnings", "Tutor payouts", "Financial settings", "Private counselling notes unless required", "Admin permissions"],
  },
  "Tutor Support": {
    summary: "Focused on tutor onboarding and support.",
    can: ["Tutors", "Tutor profiles", "Tutor onboarding", "Tutor verification status", "Group classes", "Tutor bookings", "Support requests", "Tutor support communications"],
    cannot: ["Tutor payouts", "Financial configuration", "Admin permissions"],
  },
  Finance: {
    summary: "Payments, payouts and financial reporting.",
    can: ["Payments & Earnings", "Transactions", "Tutor Payouts", "Refunds", "Payment disputes", "Relevant booking/payment information"],
    cannot: ["Private counselling information", "Admin permissions", "Tutor verification controls unless granted", "Platform settings"],
  },
  Counsellor: {
    summary: "Counselling workspace only.",
    can: ["Counselling Dashboard", "Appointments", "Counselling Students", "Intake Forms", "Action Plans", "Counsellor Settings", "Counselling sessions"],
    cannot: ["Payments", "Tutor payouts", "Financial configuration", "Admin permissions", "Other students' unrelated private information"],
  },
  "Content Manager": {
    summary: "Manages the platform's academic taxonomy and content.",
    can: ["Subjects", "Academic Levels", "Exams", "Group Class Categories", "Help Center / Knowledge Base articles", "Relevant platform content"],
    cannot: ["Financial configuration", "User management", "Admin permissions", "Counselling records"],
  },
  "Communications Manager": {
    summary: "Sends system and bulk communications.",
    can: ["Communications", "Message templates", "User directory/contact tools needed for communication"],
    cannot: ["Financial information", "Counselling information", "Permission management"],
  },
  Custom: {
    summary: "Manually selected access, set at invitation time.",
    can: [],
    cannot: [],
  },
};

export interface PermissionModuleDef {
  module: string;
  permissions: string[];
}

export const permissionModules: PermissionModuleDef[] = [
  { module: "Users", permissions: ["View students", "Edit students", "View tutors", "Edit tutors", "View email", "View phone number", "Restrict account", "Ban account", "Reactivate account"] },
  { module: "Tutor Verification", permissions: ["View verification", "Review documents", "Approve tutor", "Reject tutor", "Request resubmission"] },
  { module: "Group Classes", permissions: ["View classes", "Review classes", "Approve classes", "Reject classes", "Request changes", "Promote classes"] },
  { module: "Bookings", permissions: ["View bookings", "Cancel bookings", "View booking details", "Resolve booking issues"] },
  { module: "Counselling", permissions: ["View counselling", "View intake", "View counselling students", "Manage appointments", "Start counselling sessions", "Create recommendations", "Create action plans", "Manage counsellor availability", "View private counselling notes"] },
  { module: "Payments", permissions: ["View transactions", "View earnings", "View refunds", "View disputes", "Approve payouts", "Process refunds", "Resolve disputes"] },
  { module: "Reports", permissions: ["View reports", "Review reports", "Resolve reports", "Restrict accounts", "Ban accounts"] },
  { module: "Support", permissions: ["View support requests", "Reply to support requests", "Assign support requests", "Change support status/priority", "Close support requests"] },
  { module: "Reviews", permissions: ["View reviews", "Keep reviews", "Remove reviews", "Add admin notes"] },
  { module: "Communications", permissions: ["View user directory", "Contact individual users", "Send system messages", "Send bulk messages", "Manage templates"] },
  { module: "Analytics", permissions: ["View analytics"] },
  { module: "Platform Management", permissions: ["Manage subjects", "Manage academic levels", "Manage exams", "Manage group class categories"] },
  { module: "Knowledge Base", permissions: ["View articles", "Create articles", "Edit articles", "Publish articles", "Archive articles", "Delete articles"] },
  { module: "Settings", permissions: ["Edit own profile", "Manage notifications", "Manage platform settings", "Manage platform users", "Manage permissions", "View audit log"] },
];

export type PermissionMatrix = Record<AdminRole, Record<string, boolean>>;

function allTrue(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const m of permissionModules) for (const p of m.permissions) out[`${m.module}::${p}`] = true;
  return out;
}

function build(grants: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const m of permissionModules) for (const p of m.permissions) out[`${m.module}::${p}`] = grants.includes(`${m.module}::${p}`);
  return out;
}

export const initialPermissionMatrix: PermissionMatrix = {
  "Super Admin": allTrue(),
  "Platform Admin": build([
    "Users::View students", "Users::Edit students", "Users::View tutors", "Users::Edit tutors", "Users::View email", "Users::Restrict account",
    "Tutor Verification::View verification", "Tutor Verification::Review documents", "Tutor Verification::Approve tutor", "Tutor Verification::Reject tutor", "Tutor Verification::Request resubmission",
    "Group Classes::View classes", "Group Classes::Review classes", "Group Classes::Approve classes", "Group Classes::Reject classes", "Group Classes::Request changes",
    "Bookings::View bookings", "Bookings::View booking details", "Bookings::Cancel bookings",
    "Reports::View reports", "Reports::Review reports", "Reports::Resolve reports",
    "Support::View support requests", "Support::Reply to support requests", "Support::Assign support requests", "Support::Change support status/priority", "Support::Close support requests",
    "Communications::View user directory", "Communications::Contact individual users", "Communications::Send system messages", "Communications::Send bulk messages",
    "Analytics::View analytics",
    "Platform Management::Manage subjects", "Platform Management::Manage academic levels", "Platform Management::Manage exams", "Platform Management::Manage group class categories",
    "Knowledge Base::View articles", "Knowledge Base::Create articles", "Knowledge Base::Edit articles", "Knowledge Base::Publish articles", "Knowledge Base::Archive articles",
  ]),
  "Customer Support": build([
    "Users::View students", "Users::View tutors", "Users::View email", "Users::View phone number",
    "Bookings::View bookings", "Bookings::View booking details",
    "Reports::View reports", "Reports::Review reports",
    "Support::View support requests", "Support::Reply to support requests", "Support::Assign support requests", "Support::Change support status/priority", "Support::Close support requests",
    "Communications::View user directory", "Communications::Contact individual users",
  ]),
  "Student Support": build([
    "Users::View students", "Users::View email",
    "Bookings::View bookings", "Bookings::View booking details",
    "Reports::View reports",
    "Support::View support requests", "Support::Reply to support requests", "Support::Change support status/priority",
    "Communications::Contact individual users",
  ]),
  "Tutor Support": build([
    "Users::View tutors", "Users::View email", "Users::View phone number",
    "Tutor Verification::View verification", "Tutor Verification::Review documents",
    "Group Classes::View classes",
    "Bookings::View bookings",
    "Support::View support requests", "Support::Reply to support requests", "Support::Change support status/priority",
    "Communications::Contact individual users",
  ]),
  Finance: build([
    "Bookings::View bookings", "Bookings::View booking details", "Bookings::Resolve booking issues",
    "Payments::View transactions", "Payments::View earnings", "Payments::View refunds", "Payments::View disputes", "Payments::Approve payouts", "Payments::Process refunds", "Payments::Resolve disputes",
  ]),
  Counsellor: build([
    "Users::View students",
    "Counselling::View counselling", "Counselling::View intake", "Counselling::View counselling students", "Counselling::Manage appointments", "Counselling::Start counselling sessions", "Counselling::Create recommendations", "Counselling::Create action plans", "Counselling::Manage counsellor availability", "Counselling::View private counselling notes",
  ]),
  "Content Manager": build([
    "Platform Management::Manage subjects", "Platform Management::Manage academic levels", "Platform Management::Manage exams", "Platform Management::Manage group class categories",
    "Knowledge Base::View articles", "Knowledge Base::Create articles", "Knowledge Base::Edit articles", "Knowledge Base::Publish articles", "Knowledge Base::Archive articles", "Knowledge Base::Delete articles",
  ]),
  "Communications Manager": build([
    "Communications::View user directory", "Communications::Contact individual users", "Communications::Send system messages", "Communications::Send bulk messages", "Communications::Manage templates",
  ]),
  Custom: build([]),
};
