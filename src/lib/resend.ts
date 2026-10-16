// Server-only email sending through Resend's REST API (no SDK needed).
// Needs RESEND_API_KEY and RESEND_FROM_EMAIL (the default sender, e.g.
// "Ensena <welcome@ensena.co>") in .env. Any email can pass its own `from`
// (any address on the verified ensena.co domain) to use a different sender — never NEXT_PUBLIC_,
// the key must not reach the browser. Only import this from server actions
// / route handlers.

export interface OutgoingEmail {
  to: string;
  /** Overrides RESEND_FROM_EMAIL for this email, e.g. "Ensena Support <support@ensena.co>". */
  from?: string;
  subject: string;
  html: string;
  text: string;
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendEmail(email: OutgoingEmail): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = email.from ?? process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, error: "RESEND_API_KEY / RESEND_FROM_EMAIL are not set" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !body.id) return { ok: false, error: body.message ?? `Resend responded ${res.status}` };
    return { ok: true, id: body.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function guardianConsentEmail(input: { guardianName: string; studentName: string; relationship: string; link: string }): Omit<OutgoingEmail, "to"> {
  const guardianFirst = escapeHtml(input.guardianName.split(" ")[0] || "there");
  const student = escapeHtml(input.studentName || "your child");
  const link = escapeHtml(input.link);
  const subject = `Please confirm consent for ${input.studentName || "your child"}'s Ensena account`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:#1f2430;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e7e8ec;border-radius:16px;padding:32px;">
          <tr><td style="font-size:22px;font-weight:bold;color:#f80248;padding-bottom:24px;">ensena</td></tr>
          <tr><td style="font-size:18px;font-weight:bold;padding-bottom:12px;">Hi ${guardianFirst},</td></tr>
          <tr><td style="font-size:15px;line-height:1.6;color:#4b5060;padding-bottom:20px;">
            <strong style="color:#1f2430;">${student}</strong> has signed up to learn on Ensena and listed you as their ${escapeHtml(input.relationship.toLowerCase())}.
            Because they're under 16, we need a parent or guardian to confirm consent before their account is fully activated.
          </td></tr>
          <tr><td style="font-size:15px;line-height:1.6;color:#4b5060;padding-bottom:24px;">
            Click below to confirm consent and set a password for your Guardian Dashboard, where you can follow ${student}'s lessons, progress and payments.
          </td></tr>
          <tr><td align="center" style="padding-bottom:24px;">
            <a href="${link}" style="display:inline-block;background:#f80248;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:999px;">Confirm consent</a>
          </td></tr>
          <tr><td style="font-size:12px;line-height:1.6;color:#8a8f9c;">
            This link expires in 24 hours. If you don't know ${student} or didn't expect this email, you can safely ignore it — nothing will be activated.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Hi ${input.guardianName.split(" ")[0] || "there"},

${input.studentName || "Your child"} has signed up to learn on Ensena and listed you as their ${input.relationship.toLowerCase()}. Because they're under 16, we need a parent or guardian to confirm consent before their account is fully activated.

Confirm consent and set up your Guardian Dashboard:
${input.link}

This link expires in 24 hours. If you didn't expect this email, you can ignore it.`;

  return { subject, html, text };
}

export function passwordResetEmail(input: { name: string; link: string }): Omit<OutgoingEmail, "to"> {
  const first = input.name.split(" ")[0] || "there";
  const link = escapeHtml(input.link);
  const subject = "Reset your Ensena password";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:#1f2430;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e7e8ec;border-radius:16px;padding:32px;">
          <tr><td style="font-size:22px;font-weight:bold;color:#f80248;padding-bottom:24px;">ensena</td></tr>
          <tr><td style="font-size:18px;font-weight:bold;padding-bottom:12px;">Hi ${escapeHtml(first)},</td></tr>
          <tr><td style="font-size:15px;line-height:1.6;color:#4b5060;padding-bottom:24px;">
            We got a request to reset the password for your Ensena account. Click the button below to choose a new one.
          </td></tr>
          <tr><td align="center" style="padding-bottom:24px;">
            <a href="${link}" style="display:inline-block;background:#f80248;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:999px;">Reset password</a>
          </td></tr>
          <tr><td style="font-size:13px;line-height:1.6;color:#4b5060;padding-bottom:16px;">
            Or paste this link into your browser:<br /><a href="${link}" style="color:#f80248;word-break:break-all;">${link}</a>
          </td></tr>
          <tr><td style="font-size:12px;line-height:1.6;color:#8a8f9c;">
            This link expires in 1 hour and can only be used once. If you didn't ask to reset your password, you can ignore this email and your password won't change. Ensena will never ask for your password by email.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Hi ${first},

We got a request to reset the password for your Ensena account. Open this link to choose a new one:
${input.link}

This link expires in 1 hour and can only be used once. If you didn't ask to reset your password, you can ignore this email and your password won't change.`;

  return { subject, html, text };
}

export function welcomeEmail(input: { name: string; role: "student" | "tutor"; dashboardUrl: string }): Omit<OutgoingEmail, "to"> {
  const first = input.name.split(" ")[0] || "there";
  const link = escapeHtml(input.dashboardUrl);
  const isTutor = input.role === "tutor";
  const subject = isTutor ? "Welcome to Ensena — let's get you teaching" : "Welcome to Ensena 🎉";
  const intro = isTutor
    ? "Thanks for joining Ensena as a tutor. We're excited to have you help learners across Nigeria reach their goals."
    : "Thanks for joining Ensena. You now have access to one-on-one tutoring, group classes and academic guidance — at your own pace, on your own schedule.";
  const steps = isTutor
    ? ["Complete your tutor profile so learners can get to know you.", "Our team will review your application.", "Set your availability and start receiving bookings."]
    : ["Tell us the subjects you want help with.", "Browse tutors and group classes that fit your level.", "Book your first session and start learning."];
  const cta = isTutor ? "Go to your Tutor Dashboard" : "Go to your Dashboard";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:#1f2430;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e7e8ec;border-radius:16px;padding:32px;">
          <tr><td style="font-size:22px;font-weight:bold;color:#f80248;padding-bottom:24px;">ensena</td></tr>
          <tr><td style="font-size:18px;font-weight:bold;padding-bottom:12px;">Welcome, ${escapeHtml(first)}!</td></tr>
          <tr><td style="font-size:15px;line-height:1.6;color:#4b5060;padding-bottom:20px;">${intro}</td></tr>
          <tr><td style="font-size:15px;font-weight:bold;padding-bottom:8px;">Here's how to get started:</td></tr>
          <tr><td style="font-size:15px;line-height:1.6;color:#4b5060;padding-bottom:24px;">
            ${steps.map((s, i) => `${i + 1}. ${s}`).join("<br />")}
          </td></tr>
          <tr><td align="center" style="padding-bottom:24px;">
            <a href="${link}" style="display:inline-block;background:#f80248;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:999px;">${cta}</a>
          </td></tr>
          <tr><td style="font-size:12px;line-height:1.6;color:#8a8f9c;">
            Questions? Just email <a href="mailto:support@ensena.co" style="color:#f80248;">support@ensena.co</a> — we're happy to help.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Welcome, ${first}!

${intro}

Here's how to get started:
${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

${cta}: ${input.dashboardUrl}

Questions? Email support@ensena.co — we're happy to help.`;

  return { subject, html, text };
}
