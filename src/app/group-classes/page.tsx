import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { GroupClassesClient } from "./group-classes-client";

export const metadata: Metadata = {
  title: "Group Classes | Ensena",
  description:
    "Join live, affordable group classes led by expert tutors across every academic level.",
};

export default function GroupClassesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white pb-16 lg:pb-0">
      <Header />
      <main className="flex-1">
        <GroupClassesClient />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
