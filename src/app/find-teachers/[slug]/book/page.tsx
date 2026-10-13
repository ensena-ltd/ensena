import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getTutorBySlug, tutorListings } from "@/lib/tutors";
import { TutorBookingClient } from "./tutor-booking-client";

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
    title: `Book ${tutor.name} | Ensena`,
    description: `Book a private tutoring session with ${tutor.name}.`,
  };
}

export default async function TutorBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tutor = getTutorBySlug(slug);

  if (!tutor) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="hidden lg:block">
        <Header logoSize={48} />
      </div>
      <main className="flex-1">
        <Suspense fallback={null}>
          <TutorBookingClient tutor={tutor} />
        </Suspense>
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
