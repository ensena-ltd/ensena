// Benny, the Ensena live-chat bubble (src/components/support/benny-chat.tsx).
// Anything on the page can open it with openBenny(), e.g. the Help Center's
// "Chat with Benny" button.
export const OPEN_BENNY_EVENT = "ensena:open-benny";

export function openBenny() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_BENNY_EVENT));
}

// Pages where the bubble stays hidden: staff areas, live classrooms (it
// would cover the call controls), the Messages inbox (it would cover the
// send button) and the sign-in/sign-up screens.
const HIDDEN_PREFIXES = ["/admin", "/counsellor-dashboard", "/counsellor", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/logout", "/verify-email", "/session-reset", "/accept-invitation", "/accept-guardian-invitation"];

export function bennyHiddenOn(pathname: string): boolean {
  return pathname.includes("/classroom") || pathname.endsWith("/messages") || pathname.includes("/messages/") || HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
