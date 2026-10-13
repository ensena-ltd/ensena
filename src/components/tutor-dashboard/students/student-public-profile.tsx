import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Lock, Star, Target } from "lucide-react";

import type { StudentPublicProfile } from "@/lib/student-public-profile";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ensena-border bg-white p-5">
      <h2 className="font-heading text-sm font-semibold text-ensena-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Chips({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-ensena-muted">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span key={s} className="rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">
          {s}
        </span>
      ))}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/tutor-dashboard/students" className="inline-flex items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
      <ArrowLeft className="size-4" /> Students
    </Link>
  );
}

export function StudentPrivateNotice({ firstName }: { firstName: string }) {
  return (
    <div className="flex flex-col gap-4">
      <BackLink />
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-ensena-border bg-white px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-ensena-bg-soft">
          <Lock className="size-5 text-ensena-muted" />
        </span>
        <h1 className="font-heading text-lg font-semibold text-ensena-ink">{firstName}&apos;s profile is private</h1>
        <p className="max-w-md text-sm text-ensena-muted">
          {firstName} hasn&apos;t made their profile public. You&apos;ll be able to see it once they book a lesson or discovery session with you.
        </p>
      </div>
    </div>
  );
}

export function StudentPublicProfileView({ profile }: { profile: StudentPublicProfile }) {
  const level = [profile.academicDetail || profile.academicLevel, profile.course].filter(Boolean).join(" · ");
  const avg = profile.reviews.length ? profile.reviews.reduce((s, r) => s + r.rating, 0) / profile.reviews.length : null;
  const since = new Date(profile.memberSince).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-4">
      <BackLink />
      <div className="flex flex-col gap-4 rounded-2xl border border-ensena-border bg-white p-5 sm:flex-row sm:items-center">
        {profile.image ? (
          <Image src={profile.image} alt={profile.name} width={72} height={72} className="size-18 rounded-full object-cover" unoptimized />
        ) : (
          <span className="flex size-18 items-center justify-center rounded-full bg-ensena-primary/10 font-heading text-xl font-semibold text-ensena-primary">{initials(profile.name)}</span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-semibold text-ensena-ink">{profile.name}</h1>
          {level && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ensena-muted">
              <GraduationCap className="size-4" /> {level}
            </p>
          )}
          <p className="mt-1 text-xs text-ensena-muted">Ensena student since {since}</p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          {avg !== null && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-ensena-ink">
              <Star className="size-4 fill-amber-400 text-amber-400" /> {avg.toFixed(1)} <span className="font-normal text-ensena-muted">({profile.reviews.length})</span>
            </span>
          )}
          <span className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-muted">
            {profile.access === "public" ? "Public profile" : "Your student"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="About">
          <p className="whitespace-pre-line text-sm text-ensena-ink">{profile.bio || <span className="text-ensena-muted">No bio yet.</span>}</p>
        </Section>
        <Section title="Subjects">
          <Chips items={profile.subjects} empty="No subjects chosen yet." />
        </Section>
        <Section title="Learning goals">
          {profile.goal && (
            <p className="mb-2 flex items-start gap-1.5 text-sm font-medium text-ensena-ink">
              <Target className="mt-0.5 size-4 shrink-0 text-ensena-primary" /> {profile.goal}
            </p>
          )}
          {profile.learningGoals.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-ensena-ink">
              {profile.learningGoals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          ) : (
            !profile.goal && <p className="text-sm text-ensena-muted">No learning goals yet.</p>
          )}
        </Section>
        <Section title="Looking for help with">
          <Chips items={profile.supportTypes} empty="Not specified." />
        </Section>
      </div>

      <Section title={`Reviews from tutors${profile.reviews.length ? ` (${profile.reviews.length})` : ""}`}>
        {profile.reviews.length ? (
          <ul className="flex flex-col gap-3">
            {profile.reviews.map((r) => (
              <li key={r.id} className="rounded-xl bg-ensena-bg-soft p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ensena-ink">{r.reviewerName}</span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-ensena-ink">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" /> {r.rating}
                  </span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-ensena-muted">{r.comment}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ensena-muted">No reviews yet.</p>
        )}
      </Section>
    </div>
  );
}
