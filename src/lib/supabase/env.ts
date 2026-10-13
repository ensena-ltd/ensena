// Whether a real Supabase project is configured — checked before every real
// auth call so the app can fall back to the existing demo/platform-user
// sign-in (src/lib/demo-auth.ts, src/lib/admin-platform-users-store.ts)
// until NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are filled
// in. NEXT_PUBLIC_ vars are inlined at build time, so this is safe to call
// from both client and server code.
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
