// Absolute links and auth redirects always point back at the origin the user
// is actually on (localhost:3000, a Vercel deployment, ensena.co, dev.ensena.co…).
// That matters for auth: Supabase's PKCE verifier cookie lives on the origin
// that started the sign-in, so the callback must land on that same origin.
// SITE_URL is only the fallback when there's no request/browser to read from.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://ensena.co").replace(/\/$/, "");

// Browser-side: the origin of the current tab.
export function currentOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : SITE_URL;
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;

// Hosts we'll build links for. Anything else (a spoofed Host header) falls
// back to SITE_URL so emailed links can't be pointed at someone else's domain.
function isTrustedHost(host: string): boolean {
  const name = host.replace(/:\d+$/, "");
  if (LOCAL_HOST.test(host)) return true;
  if (name === "ensena.co" || name.endsWith(".ensena.co") || name === "ensena.app" || name.endsWith(".ensena.app")) return true;
  if (/^ensena[a-z0-9-]*\.vercel\.app$/.test(name)) return true;
  const extra = (process.env.ALLOWED_SITE_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  const vercel = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean) as string[];
  return [...extra, ...vercel].includes(name);
}

// An origin worth remembering for later emails: a real site, not a local
// dev server (a link to localhost is useless from someone's inbox).
export function isPublicOrigin(origin: string | null | undefined): origin is string {
  if (!origin) return false;
  try {
    const { host, protocol } = new URL(origin);
    return protocol === "https:" && !LOCAL_HOST.test(host) && isTrustedHost(host);
  } catch {
    return false;
  }
}

// Server-side: the origin a request came in on, from its headers.
export function originFromHeaders(h: Headers): string {
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim().toLowerCase();
  if (!host || !isTrustedHost(host)) return SITE_URL;
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0].trim();
  const proto = forwardedProto || (LOCAL_HOST.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
