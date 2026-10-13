import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BrowsePageClient } from "./browse-page-client";

export const metadata: Metadata = {
  title: "Find a Tutor | Ensena",
  description: "Browse tutors by faculty, department, level and course, or by research field and area.",
};

export default function FindTeachersBrowsePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Suspense fallback={null}>
          <BrowsePageClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
