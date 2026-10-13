export type DemoRole = "Student" | "Tutor" | "Admin";

export interface DemoAccount {
  email: string;
  role: DemoRole;
  name: string;
  dashboardHref: string;
}

export const DEMO_PASSWORD = "password123";

export const demoAccounts: DemoAccount[] = [
  { email: "student@ensena.co", role: "Student", name: "Sarah Johnson", dashboardHref: "/student-dashboard" },
  { email: "tutor@ensena.co", role: "Tutor", name: "Adaeze Okonkwo", dashboardHref: "/tutor-dashboard" },
  { email: "admin@ensena.co", role: "Admin", name: "Cynthia Ejie", dashboardHref: "/admin" },
];

export type SignInResult =
  | { ok: true; account: DemoAccount }
  | { ok: false; reason: "missing-fields" | "account-not-found" | "incorrect-password" };

export function attemptDemoSignIn(email: string, password: string): SignInResult {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) return { ok: false, reason: "missing-fields" };

  const account = demoAccounts.find((a) => a.email === trimmedEmail);
  if (!account) return { ok: false, reason: "account-not-found" };

  if (password !== DEMO_PASSWORD) return { ok: false, reason: "incorrect-password" };

  return { ok: true, account };
}
