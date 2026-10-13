import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getTutorBySlug, tutorListings } from "@/lib/tutors";
import { TutorReviewsClient } from "./tutor-reviews-client";

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

  if (!tutor) {
    return { title: "Tutor not found | Ensena" };
  }

  return {
    title: `Reviews for ${tutor.name} | Ensena`,
    description: `Read what students say about ${tutor.name}, ${tutor.subjectTitle} on Ensena.`,
  };
}

export default async function TutorReviewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tutor = getTutorBySlug(slug);

  if (!tutor) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <TutorReviewsClient tutor={tutor} />
      </main>
      <Footer />
    </div>
  );
}
