// Regression coverage for the real page-view store: path classification
// (dynamic tutor/group-class routes must stay distinct, never collapse into
// one generic bucket) and the ranking aggregation (highest-views-first,
// never alphabetical/insertion order).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

class FakeStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  clear(): void {
    this.store.clear();
  }
}

(globalThis as unknown as { window: unknown }).window = {
  localStorage: new FakeStorage(),
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
  CustomEvent: class {},
};

import { classifyPath, getPageRanking, isTrackablePath, recordPageView } from "@/lib/page-analytics-store";

beforeEach(() => {
  ((globalThis as unknown as { window: { localStorage: FakeStorage } }).window.localStorage as FakeStorage).clear();
});

test("dashboard/admin routes are never trackable — this feature answers public site traffic, not internal dashboard usage", () => {
  assert.equal(isTrackablePath("/admin/analytics"), false);
  assert.equal(isTrackablePath("/student-dashboard"), false);
  assert.equal(isTrackablePath("/tutor-dashboard/lessons"), false);
  assert.equal(isTrackablePath("/counsellor-dashboard/ai-insights"), false);
});

test("public marketing/browse pages are trackable", () => {
  assert.equal(isTrackablePath("/"), true);
  assert.equal(isTrackablePath("/find-teachers"), true);
  assert.equal(isTrackablePath("/find-teachers/adaeze-okonkwo"), true);
  assert.equal(isTrackablePath("/group-classes/neco-physics-bootcamp"), true);
});

test("two different tutor profile URLs classify as distinct entities, not one generic bucket", () => {
  const a = classifyPath("/find-teachers/adaeze-okonkwo");
  const b = classifyPath("/find-teachers/adaobi-chukwuma");
  assert.equal(a.category, "Tutor Profile");
  assert.equal(b.category, "Tutor Profile");
  assert.notEqual(a.entityId, b.entityId);
  assert.notEqual(a.title, b.title);
});

test("a real tutor slug resolves to the tutor's real name in the page title", () => {
  const result = classifyPath("/find-teachers/adaeze-okonkwo");
  assert.match(result.title, /Adaeze/i);
});

test("an unknown dynamic tutor slug still classifies as Tutor Profile with a fallback title, never throws", () => {
  const result = classifyPath("/find-teachers/no-such-tutor-xyz");
  assert.equal(result.category, "Tutor Profile");
  assert.equal(result.entityId, "no-such-tutor-xyz");
});

test("the group class listing and a specific group class dynamic page classify distinctly", () => {
  const listing = classifyPath("/group-classes");
  const specific = classifyPath("/group-classes/neco-physics-bootcamp");
  assert.equal(listing.category, "Group Classes");
  assert.equal(specific.category, "Group Class");
  assert.equal(specific.entityId, "neco-physics-bootcamp");
});

// Every ranking test below scopes its window to start exactly at (or after)
// the moment the test itself begins — strictly after the module's own seed
// data was generated at import time (see page-analytics-store.ts's
// buildSeedPageViews) — so real test events are never polluted by the
// seeded historical rows, without needing to avoid the seed's own paths.
test("getPageRanking ranks by real view count, highest first — never alphabetical or insertion order", () => {
  const testStart = Date.now();
  // Insert in an order that would look wrong if ranking were insertion-based:
  // fewer views for a path that sorts alphabetically first.
  recordPageView({ path: "/become-a-tutor", device: "Desktop", visitorId: "test-v1", sessionId: "test-s1" });
  recordPageView({ path: "/", device: "Desktop", visitorId: "test-v1", sessionId: "test-s1" });
  recordPageView({ path: "/", device: "Mobile", visitorId: "test-v2", sessionId: "test-s2" });
  recordPageView({ path: "/", device: "Mobile", visitorId: "test-v3", sessionId: "test-s3" });

  const rows = getPageRanking(testStart, testStart + 10_000);
  assert.equal(rows[0].path, "/");
  assert.equal(rows[0].views, 3);
  assert.equal(rows[0].uniqueVisitors, 3);
  assert.equal(rows[1].path, "/become-a-tutor");
  assert.equal(rows[1].views, 1);
});

test("getPageRanking's device breakdown reflects real per-view devices", () => {
  const testStart = Date.now();
  recordPageView({ path: "/help", device: "Desktop", visitorId: "test-v1", sessionId: "test-s1" });
  recordPageView({ path: "/help", device: "Mobile", visitorId: "test-v2", sessionId: "test-s2" });
  recordPageView({ path: "/help", device: "Mobile", visitorId: "test-v3", sessionId: "test-s3" });

  const [row] = getPageRanking(testStart, testStart + 10_000);
  assert.equal(row.deviceBreakdown.Desktop, 1);
  assert.equal(row.deviceBreakdown.Mobile, 2);
  assert.equal(row.deviceBreakdown.Tablet, 0);
});

test("a page view outside the requested window is excluded from the ranking", () => {
  const testStart = Date.now();
  recordPageView({ path: "/help", device: "Desktop", visitorId: "test-v1", sessionId: "test-s1" });
  const rows = getPageRanking(testStart + 10_000, testStart + 20_000); // a window entirely after this event
  assert.equal(rows.find((r) => r.path === "/help"), undefined);
});

test("recordPageView silently no-ops for a non-trackable (dashboard) path — never throws, never records", () => {
  const testStart = Date.now();
  recordPageView({ path: "/admin/analytics", device: "Desktop", visitorId: "test-v1", sessionId: "test-s1" });
  const rows = getPageRanking(testStart, testStart + 10_000);
  assert.equal(rows.length, 0);
});
