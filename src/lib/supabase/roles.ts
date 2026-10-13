// Shared by server code (require-role.ts, auth actions, /auth/callback) and
// client components — keep this file free of server-only imports.
export type AppRole = "student" | "tutor" | "admin" | "counsellor" | "guardian";

// Single source of truth for "which dashboard does this role land on".
export const dashboardHrefByRole: Record<AppRole, string> = {
  student: "/student-dashboard",
  tutor: "/tutor-dashboard",
  admin: "/admin",
  counsellor: "/counsellor-dashboard",
  guardian: "/guardian-dashboard",
};
