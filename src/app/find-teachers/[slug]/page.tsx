import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getSimilarTutors, getTutorBySlug, tutorListings } from "@/lib/tutors";
import { TutorProfileClient } from "./tutor-profile-client";

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
    title: `${tutor.name}, ${tutor.subjectTitle} | Ensena`,
    description: tutor.bio,
  };
}

export default async function TutorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tutor = getTutorBySlug(slug);

  if (!tutor) {
    notFound();
  }

  const similarTutors = getSimilarTutors(tutor);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="hidden lg:block">
        <Header />
      </div>
      <main className="flex-1">
        <TutorProfileClient tutor={tutor} similarTutors={similarTutors} />
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
