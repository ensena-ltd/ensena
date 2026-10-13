import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` already binds to 0.0.0.0 by default, so the LAN IP is
  // reachable — but this Next.js version blocks cross-origin requests to
  // dev-only assets/endpoints unless the requesting origin is allowlisted
  // here (only `localhost` is allowed out of the box). Without this, opening
  // the dev server's LAN address from a phone on the same network 403s with
  // "Blocked cross-origin request to Next.js dev resource". Wildcards cover
  // the two most common private LAN ranges so this keeps working across
  // DHCP reassignment and different networks, not just this machine's
  // current IP.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // Google sign-ups keep their Google profile photo as avatar_url.
  images: {
    remotePatterns: [
      new URL("https://lh3.googleusercontent.com/**"),
      // Profile photos uploaded at sign-up (Supabase Storage "avatars" bucket).
      // Hard-coded rather than derived from NEXT_PUBLIC_SUPABASE_URL so the
      // pattern can't silently drop out when the env var isn't loaded yet.
      new URL("https://acrsmnjfivnkzyipsxwe.supabase.co/storage/v1/object/public/**"),
    ],
  },
};

export default nextConfig;
