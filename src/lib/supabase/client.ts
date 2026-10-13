"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — safe to import from "use client" components
// (uses the public anon key, which Row Level Security is designed to be
// exposed to). Only ever import server.ts's service-role client from server
// code (server actions/Server Components) — never from here.
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
