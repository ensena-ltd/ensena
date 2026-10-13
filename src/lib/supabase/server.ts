import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client for use inside Server Components and Server
// Actions — reads/writes the real session cookie via next/headers, so
// `supabase.auth.getUser()` reflects the actual signed-in visitor on every
// request. Uses the anon key + RLS (not the service-role key from
// src/lib/supabase.ts, which intentionally bypasses RLS and is reserved for
// the two existing service-role actions under src/lib/actions/).
//
// A Server Component can't itself set cookies (Next.js only allows that in
// Server Actions/Route Handlers/proxy.ts), so `setAll` is wrapped in a
// try/catch here — proxy.ts is what actually keeps the session cookie fresh
// on every request; this client's own cookie writes only matter when it's
// used from a Server Action.
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component (no request/response to attach
          // cookies to) — safe to ignore since proxy.ts refreshes the
          // session on every request anyway.
        }
      },
    },
  });
}
