// Real, working Platform Users / invitations — localStorage-backed, same
// idiom as escrow-store.ts / admin-audit-log.ts / admin-communications-store
// so it survives navigation and is shared across every admin page. Every
// mutation logs to the real Admin Audit Log per the integration requirement
// — Platform User actions are never a separate, disconnected log.
import { logAdminAction } from "@/lib/admin-audit-log";
import type { AdminRole } from "@/lib/admin-permissions-data";
import {
  INVITATION_VALID_DAYS,
  seedInvitations,
  seedPlatformUsers,
  type InvitationStatus,
  type PlatformInvitation,
  type PlatformUserAccount,
} from "@/lib/admin-platform-users-data";

const USERS_KEY = "ensena_platform_users";
const INVITES_KEY = "ensena_platform_invitations";
export const PLATFORM_USERS_EVENT = "ensena:platform-users-changed";

function makeCachedReader<T>(key: string, seed: T) {
  let cachedRaw: string | null = null;
  let cachedParsed: T = seed;
  return (): T => {
    if (typeof window === "undefined") return seed;
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = raw ? (JSON.parse(raw) as T) : seed;
    }
    return cachedParsed;
  };
}

const readUsersRaw = makeCachedReader<PlatformUserAccount[]>(USERS_KEY, seedPlatformUsers);
const readInvitesRaw = makeCachedReader<PlatformInvitation[]>(INVITES_KEY, seedInvitations);

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(PLATFORM_USERS_EVENT));
}

export function getPlatformUsers(): PlatformUserAccount[] {
  return readUsersRaw();
}

// Invitation "Expired" is computed live from the clock rather than stored,
// so it self-heals no matter which page looks first — same reasoning as
// escrow-store.ts's auto-release check.
export function effectiveInvitationStatus(inv: PlatformInvitation): InvitationStatus | "Expired" {
  if (inv.status !== "Pending") return inv.status;
  return Date.now() > inv.expiresAtMs ? "Expired" : "Pending";
}

export function getInvitations(): PlatformInvitation[] {
  return readInvitesRaw();
}

function updateUser(id: string, patch: Partial<PlatformUserAccount>): void {
  writeJson(USERS_KEY, readUsersRaw().map((u) => (u.id === id ? { ...u, ...patch } : u)));
}

function updateInvitation(id: string, patch: Partial<PlatformInvitation>): void {
  writeJson(INVITES_KEY, readInvitesRaw().map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

export function findAccountByEmail(email: string): PlatformUserAccount | undefined {
  return readUsersRaw().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export type PlatformSignInResult =
  | { ok: true; account: PlatformUserAccount }
  | { ok: false; reason: "not-found" | "wrong-password" | "suspended" };

export function attemptPlatformUserSignIn(email: string, password: string): PlatformSignInResult {
  const account = findAccountByEmail(email);
  if (!account) return { ok: false, reason: "not-found" };
  if (account.status === "Suspended") return { ok: false, reason: "suspended" };
  if (account.password !== password) return { ok: false, reason: "wrong-password" };
  updateUser(account.id, { lastActiveLabel: "Today" });
  return { ok: true, account };
}

export function sendInvitation(input: {
  name: string;
  email: string;
  role: AdminRole;
  customSections?: string[];
  customPermissions?: Record<string, boolean>;
  invitedBy: string;
}): PlatformInvitation {
  const now = Date.now();
  const invitation: PlatformInvitation = {
    id: `inv-${now}-${Math.random().toString(36).slice(2, 7)}`,
    token: `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    name: input.name,
    email: input.email,
    role: input.role,
    customSections: input.customSections,
    customPermissions: input.customPermissions,
    invitedBy: input.invitedBy,
    invitedAtMs: now,
    expiresAtMs: now + INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000,
    status: "Pending",
  };
  writeJson(INVITES_KEY, [invitation, ...readInvitesRaw()]);
  logAdminAction("Invited platform user", input.invitedBy, `${input.name} (${input.email}): ${input.role}`);
  return invitation;
}

export function resendInvitation(id: string, actor: string): void {
  const inv = readInvitesRaw().find((i) => i.id === id);
  if (!inv) return;
  updateInvitation(id, { expiresAtMs: Date.now() + INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000, status: "Pending" });
  logAdminAction("Resent invitation", actor, `${inv.name} (${inv.email})`);
}

export function revokeInvitation(id: string, actor: string): void {
  const inv = readInvitesRaw().find((i) => i.id === id);
  if (!inv) return;
  updateInvitation(id, { status: "Revoked" });
  logAdminAction("Revoked invitation", actor, `${inv.name} (${inv.email})`);
}

export type AcceptInvitationResult =
  | { ok: true; account: PlatformUserAccount }
  | { ok: false; reason: "not-found" | "expired" | "already-used" };

export function acceptInvitation(token: string, password: string): AcceptInvitationResult {
  const invites = readInvitesRaw();
  const inv = invites.find((i) => i.token === token);
  if (!inv) return { ok: false, reason: "not-found" };
  const status = effectiveInvitationStatus(inv);
  if (status === "Expired") return { ok: false, reason: "expired" };
  if (status !== "Pending") return { ok: false, reason: "already-used" };

  const account: PlatformUserAccount = {
    id: `pu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: inv.name,
    email: inv.email,
    password,
    image: "/teacher-2.jpg.png",
    role: inv.role,
    customSections: inv.customSections,
    customPermissions: inv.customPermissions,
    status: "Active",
    invitedBy: inv.invitedBy,
    invitedAtLabel: new Date(inv.invitedAtMs).toLocaleDateString(),
    joinedAtLabel: new Date().toLocaleDateString(),
    lastActiveLabel: "Today",
  };
  writeJson(USERS_KEY, [account, ...readUsersRaw()]);
  updateInvitation(inv.id, { status: "Accepted" });
  logAdminAction("Accepted invitation and joined the platform team", inv.name, `${inv.role}`);
  return { ok: true, account };
}

export function suspendUser(id: string, actor: string): void {
  const user = readUsersRaw().find((u) => u.id === id);
  if (!user) return;
  updateUser(id, { status: "Suspended" });
  logAdminAction("Suspended platform user", actor, user.name);
}

export function reactivateUser(id: string, actor: string): void {
  const user = readUsersRaw().find((u) => u.id === id);
  if (!user) return;
  updateUser(id, { status: "Active" });
  logAdminAction("Reactivated platform user", actor, user.name);
}

export function updateUserAccess(id: string, actor: string, patch: { role: AdminRole; customSections?: string[]; customPermissions?: Record<string, boolean> }): void {
  const user = readUsersRaw().find((u) => u.id === id);
  if (!user) return;
  updateUser(id, patch);
  logAdminAction("Changed platform user's permissions", actor, `${user.name} → ${patch.role}`);
}

export function subscribePlatformUsers(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PLATFORM_USERS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PLATFORM_USERS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export { seedInvitations, seedPlatformUsers };
export type { InvitationStatus, PlatformInvitation, PlatformUserAccount } from "@/lib/admin-platform-users-data";
