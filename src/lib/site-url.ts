// The one public origin every absolute link and auth redirect is built from
// (email confirmations, OAuth, password resets, invites, calendar feeds).
// Never derived from the request host or window.location, so links always
// point at the live site — set NEXT_PUBLIC_SITE_URL to override.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://ensena.co").replace(/\/$/, "");
