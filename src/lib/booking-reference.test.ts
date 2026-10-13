import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BOOKING_REFERENCE_LENGTH,
  BOOKING_REFERENCE_PREFIXES,
  buildBookingReference,
  generateBookingReference,
  generateUniqueBookingReference,
  getBookingReferenceType,
  isValidBookingReference,
  type BookingReferenceType,
} from "./booking-reference.ts";

const TYPES = Object.keys(BOOKING_REFERENCE_PREFIXES) as BookingReferenceType[];
const VALID_CHARS = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;

test("generateBookingReference: uses the correct prefix for each booking type", () => {
  for (const type of TYPES) {
    const ref = generateBookingReference(type);
    assert.equal(ref.slice(0, 3), BOOKING_REFERENCE_PREFIXES[type]);
  }
});

test("generateBookingReference: total length is always 10 characters", () => {
  assert.equal(BOOKING_REFERENCE_LENGTH, 10);
  for (const type of TYPES) {
    for (let i = 0; i < 50; i++) {
      assert.equal(generateBookingReference(type).length, 10);
    }
  }
});

test("generateBookingReference: contains no invalid characters (no I, O, 1, 0, hyphens, spaces)", () => {
  for (const type of TYPES) {
    for (let i = 0; i < 200; i++) {
      const ref = generateBookingReference(type);
      const randomPart = ref.slice(3);
      assert.match(randomPart, VALID_CHARS);
      assert.ok(!ref.includes("-"));
      assert.ok(!ref.includes(" "));
      assert.ok(!/[IO10]/.test(randomPart));
    }
  }
});

test("generateBookingReference: references are unique across a large sample", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 5000; i++) {
    seen.add(generateBookingReference("private"));
  }
  // With 32^7 possible random segments, collisions in 5000 draws should be
  // vanishingly rare; treat near-5000 unique values as a pass.
  assert.ok(seen.size > 4990, `expected near-unique output, got ${seen.size}/5000 unique`);
});

test("isValidBookingReference: accepts well-formed references and rejects malformed ones", () => {
  assert.ok(isValidBookingReference("PRV8KX4M2Q"));
  assert.ok(isValidBookingReference("GRP7L9Q2MX"));
  assert.ok(isValidBookingReference("DIS8TQ4LMX"));
  assert.ok(!isValidBookingReference("prv8kx4m2q")); // lowercase
  assert.ok(!isValidBookingReference("PRV-8KX4M2")); // hyphen
  assert.ok(!isValidBookingReference("PRV 8KX4M2")); // space
  assert.ok(!isValidBookingReference("PRV8KX4M2")); // too short
  assert.ok(!isValidBookingReference("PRV8KX4M2QQ")); // too long
  assert.ok(!isValidBookingReference("PRV8KI4M2Q")); // contains excluded I
  assert.ok(!isValidBookingReference("PRV8KO4M2Q")); // contains excluded O
  assert.ok(!isValidBookingReference("PRV8K14M2Q")); // contains excluded 1
  assert.ok(!isValidBookingReference("PRV8K04M2Q")); // contains excluded 0
});

test("getBookingReferenceType: reverse-maps a reference's prefix to its booking type", () => {
  for (const type of TYPES) {
    const ref = generateBookingReference(type);
    assert.equal(getBookingReferenceType(ref), type);
  }
  assert.equal(getBookingReferenceType("XYZ1234567"), null);
  assert.equal(getBookingReferenceType("not-a-ref"), null);
});

test("generateUniqueBookingReference: retries on collision until a unique reference is generated", async () => {
  const taken = new Set(["PRVAAAAAAA", "PRVBBBBBBB"]);
  let calls = 0;
  const ref = await generateUniqueBookingReference("private", (candidate) => {
    calls += 1;
    return taken.has(candidate);
  });
  assert.ok(!taken.has(ref));
  assert.equal(getBookingReferenceType(ref), "private");
  assert.ok(calls >= 1);
});

test("generateUniqueBookingReference: never returns a reference that already exists, even under forced collisions", async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      generateUniqueBookingReference(
        "group",
        () => {
          attempts += 1;
          return true; // every candidate "already exists"
        },
        5
      ),
    /Could not generate a unique/
  );
  assert.equal(attempts, 5);
});

test("buildBookingReference: is deterministic — the same seed id always produces the same reference", () => {
  const a = buildBookingReference("discovery", "lesson-42");
  const b = buildBookingReference("discovery", "lesson-42");
  assert.equal(a, b);
  assert.ok(isValidBookingReference(a));
  assert.equal(getBookingReferenceType(a), "discovery");
});

test("buildBookingReference: different seed ids produce different references", () => {
  const refs = new Set(Array.from({ length: 50 }, (_, i) => buildBookingReference("private", `lesson-${i}`)));
  assert.ok(refs.size > 45, `expected mostly-distinct references, got ${refs.size}/50 unique`);
});
