// The single choke point every "this requires an account" action routes
// through — booking a tutor, a discovery session, a counsellor, saving a
// tutor, applying to teach, etc. A guest can browse and start any of these
// freely; only at the point of actually committing (the final "Book" /
// "Schedule" / "Apply" click) does this get called. If they're not logged
// in, their in-progress data is saved (see pending-action-store.ts) and
// they're sent to sign-in with a `redirectTo` back to this exact page —
// sign-in-client.tsx honors that param, so completing sign-in lands them
// right back here, not on their dashboard.
import { savePendingAction } from "@/lib/pending-action-store";
import { isLoggedIn } from "@/lib/session-store";

export type AuthGateResult = { proceed: true } | { proceed: false; redirectUrl: string };

export function requireAuthOrSaveDraft<T>(kind: string, data: T, currentPath: string): AuthGateResult {
  if (isLoggedIn()) return { proceed: true };
  const id = savePendingAction(kind, data);
  // `resume` has to live INSIDE the redirectTo target's own query string, not
  // as a sibling param on the sign-in URL — sign-in only ever forwards the
  // `redirectTo` value itself on success (`router.push(redirectTo)`), so a
  // `resume` param attached anywhere else would be silently dropped.
  const targetWithResume = `${currentPath}${currentPath.includes("?") ? "&" : "?"}resume=${id}`;
  const redirectUrl = `/sign-in?redirectTo=${encodeURIComponent(targetWithResume)}`;
  return { proceed: false, redirectUrl };
}
