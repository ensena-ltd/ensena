import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getTutorBySlug, tutorListings } from "@/lib/tutors";
import { DiscoverySessionBookingClient } from "./discovery-session-booking-client";

export function generateStaticParams() {
  return tutorListings.map((tutor) => ({ slug: tutor.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tutor = getTutorBySlug(slug);

  if (!tutor) return { title: "Tutor not found | Ensena" };

  return {
    title: `Book a Discovery Session with ${tutor.name} | Ensena`,
    description: `Meet ${tutor.name} in a short Discovery Session before committing to lessons.`,
  };
}

export default async function DiscoverySessionBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tutor = getTutorBySlug(slug);

  if (!tutor) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header logoSize={48} />
      <main className="flex-1">
        <Suspense fallback={null}>
          <DiscoverySessionBookingClient tutor={tutor} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
