import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SearchClient } from "./search-client";

export const metadata: Metadata = {
  title: "Search Tutors | Ensena",
  description: "The single results page for every guided academic search on Ensena: Undergraduate, Masters and PhD.",
};

// Single reusable results engine for the guided academic flows
// (Undergraduate/Masters/PhD — see /find-teachers/browse). General
// subject/level search continues to live at /find-teachers, which already
// serves that purpose well; SearchClient redirects there when no
// academicLevel param is present, so there is exactly one implementation
// per kind of search, not a duplicate.
export default function SearchPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Suspense fallback={null}>
          <SearchClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
