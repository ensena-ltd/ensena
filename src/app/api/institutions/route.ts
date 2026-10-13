import { NextResponse, type NextRequest } from "next/server";

import institutions from "@/data/institutions.json";
import { countryInfo } from "@/lib/geo-data";

// GET /api/institutions?country=Nigeria
// -> { institutions: [{ n: "University of Lagos", t: "u" }, ...] }
// t: "u" university, "p" polytechnic / technical university, "c" college of
// education. Built by scripts/build-institutions.cjs from the open Hipo
// world-universities list plus curated Nigeria/Ghana additions. Kept
// server-side so the ~170KB list never ships in the sign-up page bundle.
type Entry = { n: string; t: "u" | "p" | "c" };
const data = institutions as Record<string, Entry[]>;

export function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get("country") ?? "";
  const key = countryInfo(country)?.institutionsKey;
  const list = key ? (data[key] ?? []) : [];
  return NextResponse.json({ institutions: list }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
