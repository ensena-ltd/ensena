import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Every `redirectTo` query param read across the auth flow (sign-in,
// sign-up, onboarding) MUST be passed through this before being handed to
// router.push()/redirect() — it's attacker-controlled (a guest can share a
// crafted "/sign-in?redirectTo=https://evil.example" link), and an
// unvalidated absolute/protocol-relative URL there is a real open-redirect:
// a victim who signs in for real gets silently bounced off-site right after
// authenticating. Only a same-origin, absolute-path value (starts with a
// single "/", never "//" or a scheme) is ever safe to redirect to. Lives in
// this dependency-free file (not require-auth.ts) so it's safe to import
// from both client components and Server Actions.
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
