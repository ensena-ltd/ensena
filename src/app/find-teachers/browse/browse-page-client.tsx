"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AcademicBrowseFlow } from "@/components/find-teachers/browse/academic-browse-flow";

const validLevels = ["Undergraduate", "Masters", "PhD"] as const;
type ValidLevel = (typeof validLevels)[number];

function isValidLevel(value: string | null): value is ValidLevel {
  return !!value && (validLevels as readonly string[]).includes(value);
}

export function BrowsePageClient() {
  const searchParams = useSearchParams();
  const level = searchParams.get("level");

  if (!isValidLevel(level)) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-heading text-xl font-semibold text-ensena-ink">This academic level isn&apos;t supported here yet.</h1>
        <p className="mt-2 text-sm text-ensena-muted">
          This guided browsing flow is for Undergraduate, Masters and PhD students.
        </p>
        <Link href="/find-teachers" className="mt-4 inline-block text-sm font-semibold text-ensena-primary hover:underline">
          Browse all tutors instead
        </Link>
      </div>
    );
  }

  return <AcademicBrowseFlow academicLevel={level} />;
}
