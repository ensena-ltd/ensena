import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getTutorBySlug, tutorListings } from "@/lib/tutors";
import { TutorConfirmationClient } from "./tutor-confirmation-client";

export function generateStaticParams() {
  return tutorListings.map((tutor) => ({ slug: tutor.slug }));
}

export function generateMetadata(): Metadata {
  return { title: "Booking Confirmed | Ensena" };
}

export default async function TutorConfirmationPage({
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
          <TutorConfirmationClient tutor={tutor} />
        </Suspense>
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
