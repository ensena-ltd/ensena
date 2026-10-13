// The email address waiting on a confirmation link, handed from the sign-up
// form to /verify-email (which shows it and uses it for "Resend Email").
// Kept in sessionStorage rather than the URL so personal details never end
// up in the address bar, browser history or server logs.

const KEY = "ensena_pending_verification_email";

export function setPendingVerificationEmail(email: string): void {
  try {
    window.sessionStorage.setItem(KEY, email);
  } catch {
    // Storage blocked — /verify-email just shows a generic message.
  }
}

export function getPendingVerificationEmail(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
