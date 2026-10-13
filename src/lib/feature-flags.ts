// Single source of truth for feature flags. Every gated feature is checked
// through isFeatureEnabled() — never a scattered `if (someBoolean)` copied
// around the codebase — so turning a feature on/off later is a one-line
// change here, not a hunt through every file that touches it.
//
// COMMUNITY: the academic discussion platform (posts, comments, best
// answers) previewed in the "ENSEÑA — INTEGRATE COMMUNITY ARCHITECTURE"
// spec. The architecture (data model, store, routes, admin section) is
// fully built and ready — see src/lib/community-data.ts,
// community-store.ts, src/app/community/, src/app/admin/(dashboard)/community/.
// It stays OFF until explicitly activated: flip the value below to `true`.
// No other code change is required to activate it.
const FEATURE_FLAGS = {
  community: false,
} as const;

export type FeatureName = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(feature: FeatureName): boolean {
  return FEATURE_FLAGS[feature];
}
