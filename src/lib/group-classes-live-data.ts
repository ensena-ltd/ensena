// Merges the legacy, static groupClassListings seed with real,
// tutor-submitted-and-approved classes from group-class-submission-store.ts.
// Kept as a separate layer (rather than changing groupClassListings itself)
// so the ~18 existing consumers of the static array are unaffected — only
// the surfaces that need to reflect brand-new classes opt into this.
import { getGroupClassSubmissions, submissionToGroupClassListing } from "@/lib/group-class-submission-store";
import { groupClassListings, type GroupClassListing } from "@/lib/group-classes-data";

export function getLiveGroupClassListings(): GroupClassListing[] {
  const approved = getGroupClassSubmissions()
    .map(submissionToGroupClassListing)
    .filter((c): c is GroupClassListing => c !== null);
  return [...groupClassListings, ...approved];
}

export function getLiveGroupClassBySlug(slug: string): GroupClassListing | undefined {
  return getLiveGroupClassListings().find((c) => c.slug === slug);
}

export function getSimilarLiveGroupClasses(cls: GroupClassListing, count = 3): GroupClassListing[] {
  const all = getLiveGroupClassListings();
  return all
    .filter((c) => c.slug !== cls.slug && c.subject === cls.subject)
    .concat(all.filter((c) => c.slug !== cls.slug && c.subject !== cls.subject))
    .slice(0, count);
}
