// Real, secure, persisted reference codes for records genuinely CREATED at
// runtime during a running session — as opposed to buildBookingReference's
// deterministic derivation for pre-seeded mock data (see that function's own
// doc comment for why seed data can't use this store: it would produce a
// hydration mismatch, since the server has no localStorage to have already
// issued a code from).
//
// A record created here springs into existence purely client-side, after
// hydration, in response to a real user action (e.g. a tutor clicking "End
// Class" on a live group session, or a dispute being opened) — there is no
// SSR render of content that doesn't exist yet, so it's safe to generate a
// genuinely random code the first time and persist it forever from then on.
//
// Same localStorage + CustomEvent idiom as every other store in this app
// (escrow-store.ts, admin-audit-log.ts, ...).
import { generateReferenceCode, type ReferenceCodeType } from "@/lib/booking-reference";

const REGISTRY_KEY = "ensena_reference_codes";

interface ReferenceCodeRegistry {
  // "type:internalId" -> issued code
  byRecord: Record<string, string>;
  // Every code ever issued, for O(1) uniqueness checks across all types.
  issued: Record<string, true>;
}

function readRegistry(): ReferenceCodeRegistry {
  if (typeof window === "undefined") return { byRecord: {}, issued: {} };
  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY);
    if (!raw) return { byRecord: {}, issued: {} };
    return JSON.parse(raw) as ReferenceCodeRegistry;
  } catch {
    return { byRecord: {}, issued: {} };
  }
}

function writeRegistry(registry: ReferenceCodeRegistry): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

// Generates a genuinely random, collision-checked code for a brand-new
// record and persists it forever — or returns the already-issued code if
// this exact (type, internalId) pair has been seen before. Call this once,
// at the moment the record is created (never on every render/view), and
// store the internalId so later lookups return the same code.
export function issueOrGetReferenceCode(type: ReferenceCodeType, internalId: string, maxAttempts = 10): string {
  if (typeof window === "undefined") {
    // No SSR path should ever reach this for a genuinely-new runtime record
    // (it doesn't exist yet at server-render time) — this fallback only
    // guards against a stray server-side call, and is never persisted.
    return generateReferenceCode(type);
  }
  const registry = readRegistry();
  const key = `${type}:${internalId}`;
  const existing = registry.byRecord[key];
  if (existing) return existing;

  let code = generateReferenceCode(type);
  for (let attempt = 0; registry.issued[code] && attempt < maxAttempts; attempt++) {
    code = generateReferenceCode(type);
  }
  registry.byRecord[key] = code;
  registry.issued[code] = true;
  writeRegistry(registry);
  return code;
}

// True only if a code has already been issued for this record — use this to
// avoid triggering a fresh generation from a read-only context (e.g. a
// search index) where none should be minted.
export function hasIssuedReferenceCode(type: ReferenceCodeType, internalId: string): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(readRegistry().byRecord[`${type}:${internalId}`]);
}
