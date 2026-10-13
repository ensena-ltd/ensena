import { counsellor } from "@/lib/counsellor-data";
import type { AdminRole } from "@/lib/admin-permissions-data";

export type PlatformAccountStatus = "Active" | "Suspended";
export type InvitationStatus = "Pending" | "Accepted" | "Revoked";

export interface PlatformUserAccount {
  id: string;
  name: string;
  email: string;
  // Demo-only, plaintext — this whole app's sign-in is a single shared demo
  // password (see demo-auth.ts's DEMO_PASSWORD); this mirrors that same
  // non-production posture rather than pretending to hash anything.
  password: string;
  image: string;
  role: AdminRole;
  customSections?: string[];
  customPermissions?: Record<string, boolean>;
  status: PlatformAccountStatus;
  invitedBy: string;
  invitedAtLabel: string;
  joinedAtLabel: string;
  lastActiveLabel: string;
}

export interface PlatformInvitation {
  id: string;
  token: string;
  name: string;
  email: string;
  role: AdminRole;
  customSections?: string[];
  customPermissions?: Record<string, boolean>;
  invitedBy: string;
  invitedAtMs: number;
  expiresAtMs: number;
  status: InvitationStatus;
}

export const INVITATION_VALID_DAYS = 7;

export const seedPlatformUsers: PlatformUserAccount[] = [
  {
    id: "pu-1",
    name: "Sarah Johnson",
    email: "sarah@ensenahq.com",
    password: "password123",
    image: "/teacher-4.jpg.png",
    role: "Customer Support",
    status: "Active",
    invitedBy: "Cynthia Ejie",
    invitedAtLabel: "Aug 20, 2026",
    joinedAtLabel: "Aug 21, 2026",
    lastActiveLabel: "Today",
  },
  {
    id: "pu-2",
    name: "David Okafor",
    email: "david@ensenahq.com",
    password: "password123",
    image: "/teacher-3.jpg.png",
    role: "Finance",
    status: "Active",
    invitedBy: "Cynthia Ejie",
    invitedAtLabel: "Aug 18, 2026",
    joinedAtLabel: "Aug 19, 2026",
    lastActiveLabel: "Yesterday",
  },
  {
    id: "pu-3",
    name: counsellor.name,
    email: "benny@ensenahq.com",
    password: "password123",
    image: counsellor.image,
    role: "Counsellor",
    status: "Active",
    invitedBy: "Cynthia Ejie",
    invitedAtLabel: "Jan 3, 2021",
    joinedAtLabel: "Jan 4, 2021",
    lastActiveLabel: "Today",
  },
  {
    id: "pu-4",
    name: "Zainab Aliyu",
    email: "zainab@ensenahq.com",
    password: "password123",
    image: "/teacher-2.jpg.png",
    role: "Tutor Support",
    status: "Active",
    invitedBy: "Cynthia Ejie",
    invitedAtLabel: "Jul 10, 2026",
    joinedAtLabel: "Jul 11, 2026",
    lastActiveLabel: "Today",
  },
  {
    id: "pu-5",
    name: "Uche Nnamdi",
    email: "uche@ensenahq.com",
    password: "password123",
    image: "/teacher-1.jpg.png",
    role: "Student Support",
    status: "Active",
    invitedBy: "Cynthia Ejie",
    invitedAtLabel: "Jul 12, 2026",
    joinedAtLabel: "Jul 13, 2026",
    lastActiveLabel: "Today",
  },
];

export const seedInvitations: PlatformInvitation[] = [
  {
    id: "inv-1",
    token: "seed-token-john-smith",
    name: "John Smith",
    email: "john.smith@ensenahq.com",
    role: "Tutor Support",
    invitedBy: "Cynthia Ejie",
    invitedAtMs: new Date(2026, 7, 26).getTime(),
    expiresAtMs: new Date(2026, 8, 2).getTime(),
    status: "Pending",
  },
];
