"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Heart, MessageSquare, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiveTutorRating } from "@/components/shared/live-tutor-rating";
import { useSavedTutorSlugs } from "@/hooks/use-saved-tutor";
import { toggleSavedTutor } from "@/lib/discovery-store";
import { formatNaira } from "@/lib/format";
import { getTutorBySlug } from "@/lib/tutors";
import { isTutorVerifiedByName } from "@/lib/tutor-verification-store";

// Single source of truth: the same discovery-store wishlist the Like button
// uses everywhere else (find-teachers cards, tutor profile, homepage
// recommendations) — liking/unliking anywhere shows up here, and removing
// here shows up everywhere else, because there is exactly one saved-slugs
// list, not a page-local copy of it.
export function SavedTutorsClient() {
  const router = useRouter();
  const slugs = useSavedTutorSlugs();
  const tutors = slugs.map((slug) => getTutorBySlug(slug)).filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Saved Tutors</h1>
        <p className="mt-1 text-sm text-ensena-muted">Your tutor wishlist: {tutors.length} saved.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {tutors.map((t) => (
          <div key={t.slug} className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-start justify-between">
              <Link href={`/find-teachers/${t.slug}`} className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-full">
                  <Image src={t.image} alt={t.name} fill sizes="56px" className="object-cover" />
                </div>
                <div>
                  <p className="flex items-center gap-1 text-sm font-semibold text-ensena-ink">
                    {t.name} {isTutorVerifiedByName(t.name) && <BadgeCheck className="size-3.5 text-ensena-primary" aria-label="Verified tutor" />}
                  </p>
                  <p className="text-xs text-ensena-muted">{t.subjectTitle}</p>
                </div>
              </Link>
              <button type="button" onClick={() => toggleSavedTutor(t.slug)} aria-label={`Remove ${t.name} from saved tutors`}>
                <Heart className="size-5 fill-ensena-primary text-ensena-primary" />
              </button>
            </div>
            <p className="mt-3 flex items-center gap-1 text-sm text-ensena-ink">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <LiveTutorRating name={t.name} rating={t.rating} reviews={t.reviews}>{(live) => <>{live.rating} ({live.reviews} reviews)</>}</LiveTutorRating>
            </p>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="font-semibold text-ensena-ink">{formatNaira(t.price)}/hr</span>
              {t.availableToday && <span className="rounded-full bg-ensena-success/10 px-2 py-0.5 text-xs font-semibold text-ensena-success">Available Today</span>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(t.name)}`)}
                className="flex items-center justify-center gap-1 rounded-full border border-ensena-border py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                <MessageSquare className="size-3.5" /> Message
              </button>
              <Button nativeButton={false} render={<Link href={`/find-teachers/${t.slug}`} />} className="h-auto rounded-full bg-ensena-primary py-1.5 text-xs font-semibold text-white">
                View Profile
              </Button>
            </div>
          </div>
        ))}
        {tutors.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-16 text-center">
            <Heart className="size-8 text-ensena-border" />
            <p className="text-sm font-medium text-ensena-ink">You haven&apos;t saved any tutors yet.</p>
            <Link href="/student-dashboard/find-a-tutor" className="text-sm font-semibold text-ensena-primary hover:underline">Browse tutors →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
