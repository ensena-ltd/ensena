import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton, constructed on first actual use rather than at module
// load. That way a page that merely imports a server action using this
// client (e.g. via the contact/newsletter forms) doesn't fail to build or
// prerender before NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are
// configured — createClient() throws immediately if either is missing.
// Stashing it on `globalThis` in dev survives hot-reload re-executing this
// module on every save, so we don't spin up a new client each time.
const globalForSupabase = globalThis as unknown as { supabase?: SupabaseClient };

// Server-only — uses the service role key, which bypasses Row Level
// Security. That's fine here: every caller of this file is a server action
// under src/lib/actions/, never code shipped to the browser, and the tables
// it writes to (see supabase/migrations/) have RLS enabled with no public
// policies, so the anon key couldn't touch them anyway. Never import this
// from a "use client" component.
export function getSupabaseServerClient(): SupabaseClient {
  if (globalForSupabase.supabase) return globalForSupabase.supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — set them in .env (see .env.example)."
    );
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForSupabase.supabase = client;
  }
  return client;
}
