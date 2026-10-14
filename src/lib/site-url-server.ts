import { headers } from "next/headers";
import { originFromHeaders, SITE_URL } from "@/lib/site-url";

// The origin of the current request (server actions, route handlers, server
// components). Falls back to SITE_URL outside a request, e.g. in cron jobs.
export async function requestOrigin(): Promise<string> {
  try {
    return originFromHeaders(await headers());
  } catch {
    return SITE_URL;
  }
}
