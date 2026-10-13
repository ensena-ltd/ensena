import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileSearchHeader } from "@/components/find-teachers/mobile-search-header";
import { FindTeachersClient } from "./find-teachers-client";

export const metadata: Metadata = {
  title: "Find Teachers | Ensena",
  description:
    "Browse and filter verified tutors across every academic level, subject and budget on Ensena.",
};

export default function FindTeachersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white pb-16 lg:pb-0">
      <div className="hidden lg:block">
        <Header />
      </div>
      <MobileSearchHeader />
      <main className="flex-1">
        <Suspense fallback={null}>
          <FindTeachersClient />
        </Suspense>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
