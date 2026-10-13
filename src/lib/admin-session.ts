// The "who is currently logged into the Admin Dashboard" concept. This app
// has no real backend/server session anywhere (see demo-auth.ts — sign-in
// is a hardcoded 3-account check with no session persistence at all today),
// so this is a client-side, localStorage-backed session: genuinely
// functional for gating the sidebar/routes/actions within a browser, but
// — like literally every other page in this app — not a real security
// boundary a determined user couldn't bypass via devtools. Server-side
// enforcement would require adding real backend infrastructure this app
// doesn't have.
import { adminRoles, allSections, initialPermissionMatrix, sectionAccessByRole, type AdminRole } from "@/lib/admin-permissions-data";

const SESSION_KEY = "ensena_admin_session";

export interface AdminSession {
  userId: string;
  name: string;
  email: string;
  image?: string;
  role: AdminRole;
  // Only meaningful when role === "Custom" — the exact section keys this
  // person was granted at invite time.
  customSections?: string[];
  // Only meaningful when role === "Custom" — the exact granular permissions
  // this person was granted at invite time (module::permission -> boolean).
  customPermissions?: Record<string, boolean>;
}

// Default session so every existing admin page keeps working exactly as
// before for anyone who hasn't gone through the new sign-in flow — the
// Super Admin persona this whole dashboard was built around.
export const defaultSuperAdminSession: AdminSession = {
  userId: "platform-super-admin",
  name: "Cynthia Ejie",
  email: "admin@ensena.co",
  image: "/teacher-4.jpg.png",
  role: "Super Admin",
};

// Caches the parsed session and only re-parses when the raw localStorage
// string actually changes — same idiom as makeCachedReader in
// admin-platform-users-store.ts. Without this, useSyncExternalStore's
// getSnapshot would return a new object reference on every call even when
// nothing changed, which React treats as "the store changed on every
// render" and throws "Maximum update depth exceeded".
let cachedRaw: string | null = null;
let cachedSession: AdminSession = defaultSuperAdminSession;

export function getCurrentAdminSession(): AdminSession {
  if (typeof window === "undefined") return defaultSuperAdminSession;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSession = raw ? (JSON.parse(raw) as AdminSession) : defaultSuperAdminSession;
    } catch {
      cachedSession = defaultSuperAdminSession;
    }
  }
  return cachedSession;
}

export function setCurrentAdminSession(session: AdminSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent("ensena:admin-session-changed"));
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent("ensena:admin-session-changed"));
}

// A short, identifiable actor string for audit log entries — the entire
// point of this system per spec: "Sarah Johnson approved tutor Tunde
// Adebayo", never a generic "Admin".
export function currentActorLabel(): string {
  const s = getCurrentAdminSession();
  return s.role === "Super Admin" ? s.name : `${s.name} (${s.role})`;
}

export function sectionsFor(session: AdminSession): string[] {
  // customSections is an override an inviter can set regardless of which
  // preset role was picked ("Allow the Super Admin to modify permissions
  // before sending if appropriate") — not exclusive to the "Custom" role.
  if (session.customSections) return session.customSections;
  if (session.role === "Custom") return ["Dashboard"];
  return sectionAccessByRole[session.role] ?? ["Dashboard"];
}

export function canAccessSection(session: AdminSession, sectionKey: string): boolean {
  if (session.role === "Super Admin") return true;
  return sectionsFor(session).includes(sectionKey);
}

// Route-guard helper: given a pathname like "/admin/payments/payouts/py-1",
// find the deepest matching section (by longest href prefix) and check
// access. Paths with no matching section (e.g. a not-yet-migrated page) are
// left open rather than false-blocking real functionality.
export function canAccessPath(session: AdminSession, pathname: string): boolean {
  if (session.role === "Super Admin") return true;
  const matches = allSections.filter((s) => pathname === s.href || pathname.startsWith(`${s.href}/`) || pathname.startsWith(`${s.href}?`));
  if (matches.length === 0) return true;
  const best = matches.sort((a, b) => b.href.length - a.href.length)[0];
  return canAccessSection(session, best.key);
}

export function hasPermission(session: AdminSession, module: string, permission: string): boolean {
  if (session.role === "Super Admin") return true;
  const key = `${module}::${permission}`;
  if (session.customPermissions) return Boolean(session.customPermissions[key]);
  if (session.role === "Custom") return false;
  return Boolean(initialPermissionMatrix[session.role]?.[key]);
}

export function isValidRole(role: string): role is AdminRole {
  return (adminRoles as string[]).includes(role) || role === "Custom";
}
