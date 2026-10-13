"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Heart, MapPin, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setTutorSaved } from "@/lib/actions/student-profile";
import type { SavedTutorCard } from "@/lib/student-profile-server";

// The signed-in student's saved tutors (public.saved_tutors), with each
// tutor's details from their registration.
export function SavedTutorsReal({ tutors }: { tutors: SavedTutorCard[] }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(t: SavedTutorCard) {
    setRemoving(t.tutorId);
    const result = await setTutorSaved(t.tutorId, false);
    setRemoving(null);
    if (!result.ok) {
      toast.error(result.message ?? "Couldn't remove that tutor.");
      return;
    }
    toast.success(`${t.name} removed from your saved tutors.`);
    router.refresh();
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Saved Tutors</h1>
      <p className="mt-1 text-sm text-ensena-muted">Tutors you&apos;ve saved to come back to.</p>

      {tutors.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><Heart className="size-6" /></span>
          <p className="font-heading text-lg font-semibold text-ensena-ink">No saved tutors yet</p>
          <p className="max-w-sm text-sm text-ensena-muted">Tap the heart on a tutor&apos;s profile to save them here.</p>
          <Button nativeButton={false} render={<Link href="/student-dashboard/find-a-tutor" />} className="mt-1 h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            <Search className="size-4" /> Find a Tutor
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tutors.map((t) => (
            <div key={t.tutorId} className="flex flex-col rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-start gap-3">
                <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ensena-primary/10 font-semibold text-ensena-primary">
                  {t.image ? <Image src={t.image} alt={t.name} fill sizes="56px" className="object-cover" /> : t.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 font-semibold text-ensena-ink">
                    {t.name} {t.status === "approved" && <BadgeCheck className="size-4 text-ensena-primary" aria-label="Verified tutor" />}
                  </p>
                  <p className="line-clamp-2 text-xs text-ensena-muted">{t.headline || t.subjects.slice(0, 3).join(", ")}</p>
                  {t.country && <p className="mt-1 flex items-center gap-1 text-xs text-ensena-muted"><MapPin className="size-3" /> {t.country}</p>}
                </div>
              </div>
              {t.subjects.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.subjects.slice(0, 5).map((s) => <span key={s} className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">{s}</span>)}
                  {t.subjects.length > 5 && <span className="px-1 py-1 text-xs text-ensena-muted">+{t.subjects.length - 5}</span>}
                </div>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <span className="text-sm font-semibold text-ensena-ink">{t.pricePerHour ? `₦${Number(t.pricePerHour).toLocaleString("en-NG")}/hr` : ""}</span>
                <Button variant="outline" loading={removing === t.tutorId} onClick={() => remove(t)} className="h-9 rounded-full border-ensena-border px-4 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                  <Heart className="size-3.5 fill-rose-600" /> Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
