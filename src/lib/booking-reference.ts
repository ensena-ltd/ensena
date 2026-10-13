// Public-facing reference codes ("Booking ID", "Dispute ID", "Payout ID",
// etc.), shown to students, tutors, and admins instead of internal database
// ids/UUIDs. Short, no hyphens or spaces, and drawn from a charset with
// ambiguous characters (I, O, 1, 0) removed so they're easy to read back
// over the phone. One shared system for every entity that needs a
// human-facing code — do not build a second, differently-shaped id scheme
// for a new entity type; add its prefix here instead.
//
// Add new reference types by adding an entry to REFERENCE_CODE_PREFIXES —
// generation, validation, and parsing all key off that map, so nothing else
// needs to change.
export const REFERENCE_CODE_PREFIXES = {
  private: "PRV",
  group: "GRP",
  discovery: "DSC",
  counselling: "CNS",
  support: "SUP",
  dispute: "DSP",
  payout: "PYT",
  report: "RPT",
  class: "CLS",
  session: "SES",
  review: "REV",
  community: "CMP",
  user: "USR",
  tutor: "TUT",
  student: "STD",
  payment: "PAY",
  article: "ART",
} as const;

// Old name, kept as an alias — every existing call site imports this name.
export const BOOKING_REFERENCE_PREFIXES = REFERENCE_CODE_PREFIXES;

export type ReferenceCodeType = keyof typeof REFERENCE_CODE_PREFIXES;
export type BookingReferenceType = ReferenceCodeType;

const RANDOM_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 1, 0 — 32 characters
// 8 random characters (11-char code overall) for every reference generated
// from here on. Bumped from 7 → 8 to match the platform-wide standard;
// existing codes already issued/displayed at 7 characters are still valid
// and unchanged (see REFERENCE_FORMAT below and buildBookingReference's own
// doc comment) — this only affects newly generated codes, never rewrites
// history.
const RANDOM_LENGTH = 8;
const LEGACY_RANDOM_LENGTH = 7;
const PREFIX_LENGTH = 3;
export const BOOKING_REFERENCE_LENGTH = PREFIX_LENGTH + RANDOM_LENGTH;
export const REFERENCE_CODE_LENGTH = BOOKING_REFERENCE_LENGTH;

// Accepts both the current 8-char-random shape and the legacy 7-char-random
// shape already baked into on-screen/stored codes from before this change,
// so isValidBookingReference never starts rejecting a code it previously
// accepted.
const REFERENCE_FORMAT = new RegExp(`^[A-Z]{${PREFIX_LENGTH}}[${RANDOM_CHARSET}]{${LEGACY_RANDOM_LENGTH},${RANDOM_LENGTH}}$`);

// 256 % 32 === 0, so every byte value maps onto the 32-character charset
// with exactly zero bias — no rejection sampling needed for this alphabet
// size specifically.
function secureRandomSegment(): string {
  const bytes = new Uint8Array(RANDOM_LENGTH);
  crypto.getRandomValues(bytes);
  let segment = "";
  for (let i = 0; i < RANDOM_LENGTH; i++) {
    segment += RANDOM_CHARSET[bytes[i] % RANDOM_CHARSET.length];
  }
  return segment;
}

/**
 * Generates a single candidate reference code using the browser's
 * cryptographically-secure random source (never Math.random()), e.g.
 * generateReferenceCode("private") -> "PRV8KX4M2QZ". This is what real record
 * creation should call — see reference-code-store.ts for the persisted,
 * collision-checked version actually used when a new record is created at
 * runtime. Not guaranteed unique on its own — pair it with
 * generateUniqueReferenceCode against your storage layer.
 */
export function generateReferenceCode(type: ReferenceCodeType): string {
  return `${REFERENCE_CODE_PREFIXES[type]}${secureRandomSegment()}`;
}

// Old name, kept as an alias.
export const generateBookingReference = generateReferenceCode;

/** True if `value` matches the [3-letter prefix][7-or-8 charset chars] shape (11 chars for anything generated now, 10 for a code issued before the length was bumped to 8). Does not check that the prefix belongs to a known reference type — see getReferenceCodeType for that. */
export function isValidBookingReference(value: string): boolean {
  return REFERENCE_FORMAT.test(value);
}

/** Reverse-maps a reference's prefix back to its entity type, e.g. for admin search result labeling. Returns null for an unrecognized/malformed reference. */
export function getReferenceCodeType(value: string): ReferenceCodeType | null {
  if (!isValidBookingReference(value)) return null;
  const prefix = value.slice(0, PREFIX_LENGTH);
  const match = (Object.entries(REFERENCE_CODE_PREFIXES) as [ReferenceCodeType, string][]).find(([, p]) => p === prefix);
  return match?.[0] ?? null;
}

// Old name, kept as an alias.
export const getBookingReferenceType = getReferenceCodeType;

/**
 * Generates a reference code guaranteed unique against `exists`, retrying
 * on collision. Framework-agnostic — pass whatever lookup fits your storage.
 * Call this once, at the moment a record is successfully created, and
 * persist the result; never regenerate it afterward. See
 * reference-code-store.ts for the version wired to this app's real
 * localStorage-backed persistence.
 */
export async function generateUniqueReferenceCode(
  type: ReferenceCodeType,
  exists: (reference: string) => boolean | Promise<boolean>,
  maxAttempts = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateReferenceCode(type);
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error(`Could not generate a unique "${type}" reference code after ${maxAttempts} attempts.`);
}

// Old name, kept as an alias.
export const generateUniqueBookingReference = generateUniqueReferenceCode;

// ---------------------------------------------------------------------------
// Demo-only stand-in below. This app has no creation backend for its seed
// data (see src/lib/actions/ — only contact/newsletter exist) — every
// booking, dispute, payout, etc. an admin/student/tutor sees today is
// pre-seeded mock data that "already existed" before this running instance,
// not something created through a real flow with somewhere to persist a
// freshly-generated code. buildBookingReference deterministically derives a
// reference from a mock record's existing id instead: same id in, same
// reference out, on every render — including the very first server render,
// which a real crypto-random value could never match (there being no
// backend to have already stored one) — so this MUST stay pure and
// synchronous, never read storage, for every seed-derived record.
//
// A record actually created at runtime during this running session (e.g. a
// new dispute opened, or a new escrow session on a live group class ending)
// is not seed data and has no such constraint — those call
// reference-code-store.ts's real, secure, persisted generator instead.
//
// Once real record creation exists for a given entity, delete its use of
// this function and switch those call sites to read the column populated by
// generateUniqueReferenceCode at creation time.
export function buildBookingReference(type: ReferenceCodeType, seedId: string): string {
  let hash = 0;
  for (let i = 0; i < seedId.length; i++) {
    hash = (hash * 31 + seedId.charCodeAt(i)) >>> 0;
  }
  let segment = "";
  for (let i = 0; i < RANDOM_LENGTH; i++) {
    segment += RANDOM_CHARSET[hash % RANDOM_CHARSET.length];
    hash = Math.floor(hash / RANDOM_CHARSET.length) || (hash * 31 + i) >>> 0;
  }
  return `${REFERENCE_CODE_PREFIXES[type]}${segment}`;
}
