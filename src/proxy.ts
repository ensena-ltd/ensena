// Next.js 16 renamed the "middleware.ts" file convention to "proxy.ts" (the
// exported function is now named `proxy`, not `middleware`) — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
// This runs on every request (Node.js runtime, the v16 default) and does two
// things: (1) refreshes the Supabase session cookie so it doesn't expire
// mid-visit, and (2) an optimistic "is there a session at all" check for
// dashboard routes — calling `supabase.auth.getUser()` revalidates the JWT
// against Supabase's own server, which is the recommended check here (NOT a
// custom database/role lookup — that stays in each dashboard layout, closer
// to the data it's protecting, per Next's own auth guidance).
//
// While NEXT_PUBLIC_SUPABASE_URL/ANON_KEY aren't configured yet, this no-ops
// entirely so the existing demo/platform-user sign-in keeps working
// unchanged — see src/lib/supabase/env.ts.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";

const PROTECTED_PREFIXES = ["/student-dashboard", "/tutor-dashboard", "/guardian-dashboard", "/counsellor-dashboard", "/admin"];

// Browsers send every cookie for the host with every request. On localhost
// that includes cookies from every other app you run on any port — enough of
// them and a server rejects the request with "HTTP ERROR 431" (headers too
// large). scripts/next.mjs raises Node's limit to 64KB so such requests still
// reach this proxy; here, once the Cookie header passes 12KB, cookies Ensena
// doesn't use are deleted as the page loads normally (a size that's harmless
// now, but would break servers with the usual 16KB limit).
//
// Ensena's own sign-in cookies are NEVER touched here — a Google session is
// several KB on its own, and clearing it would sign the visitor out on every
// page. Only if the header nears the 64KB hard limit even after a cleanup
// attempt (marker cookie) — cookies the browser won't let us remove — does
// a full page visit get /session-reset with manual steps. Form submissions
// (server actions) and background requests are never redirected.
const MAX_COOKIE_HEADER_BYTES = 12 * 1024;
const RESET_PAGE_COOKIE_HEADER_BYTES = 48 * 1024;
const SESSION_RESET_PATH = "/session-reset";
const CLEANUP_MARKER = "ensena_cookie_cleanup";

function isEnsenaCookie(name: string): boolean {
  if (name === CLEANUP_MARKER) return true;
  if (!isSupabaseConfigured()) return false;
  // Supabase names its cookies sb-<project-ref>-auth-token(.0/.1/-code-verifier).
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()).hostname.split(".")[0];
  return name.startsWith(`sb-${ref}-auth-token`);
}

type CookieCleanup = { redirect: NextResponse } | { apply: (response: NextResponse) => NextResponse } | null;

function planCookieCleanup(request: NextRequest): CookieCleanup {
  const header = request.headers.get("cookie") ?? "";
  if (header.length <= MAX_COOKIE_HEADER_BYTES) return null;

  if (request.cookies.has(CLEANUP_MARKER)) {
    const stuck = request.cookies.getAll().filter((c) => !isEnsenaCookie(c.name));
    if (process.env.NODE_ENV !== "production" && stuck.length > 0) {
      console.warn(
        `[proxy] ${header.length} bytes of cookies still sent after cleanup. Cookies from other sites that couldn't be removed:`,
        stuck.map((c) => `${c.name} (${c.value.length}B)`).join(", ")
      );
    }
    // A real top-level page load, not a server action / client-side
    // navigation fetch (those can't follow a redirect to another page).
    const dest = request.headers.get("sec-fetch-dest");
    const isPageVisit =
      request.method === "GET" &&
      !request.nextUrl.searchParams.has("_rsc") &&
      (dest ? dest === "document" : (request.headers.get("accept") ?? "").includes("text/html"));
    if (header.length <= RESET_PAGE_COOKIE_HEADER_BYTES || !isPageVisit || request.nextUrl.pathname === SESSION_RESET_PATH) return null;
    const url = request.nextUrl.clone();
    url.pathname = SESSION_RESET_PATH;
    url.search = "";
    return { redirect: NextResponse.redirect(url) };
  }

  const foreign = request.cookies.getAll().filter((c) => !isEnsenaCookie(c.name));
  // Downstream code (Supabase, pages) only needs Ensena's cookies.
  foreign.forEach((c) => request.cookies.delete(c.name));
  return {
    apply: (response) => {
      foreign.forEach((c) =>
        response.cookies.set(c.name, "", {
          path: "/",
          maxAge: 0,
          expires: new Date(0),
          // __Secure-/__Host- cookies can only be removed by a Set-Cookie
          // that is itself Secure (browsers treat localhost as secure).
          secure: c.name.startsWith("__Secure-") || c.name.startsWith("__Host-") || request.nextUrl.protocol === "https:",
        })
      );
      response.cookies.set(CLEANUP_MARKER, "1", { path: "/", maxAge: 60, sameSite: "lax" });
      return response;
    },
  };
}

export async function proxy(request: NextRequest) {
  const cleanup = planCookieCleanup(request);
  if (cleanup && "redirect" in cleanup) return cleanup.redirect;
  const finish = (response: NextResponse) => (cleanup ? cleanup.apply(response) : response);

  if (!isSupabaseConfigured()) return finish(NextResponse.next({ request }));

  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Revalidates the JWT with Supabase Auth (unlike getSession(), which only
  // reads the cookie without checking it's still valid) — the correct
  // "optimistic" check to do here per Supabase's own Next.js SSR guidance.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return finish(NextResponse.redirect(url));
  }

  return finish(response);
}

export const config = {
  matcher: [
    // Everything except static assets/image optimization/favicon — running
    // on every route (not just the dashboards) is what actually keeps the
    // session cookie refreshed platform-wide.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
