import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CommunityPostDetailClient } from "@/components/community/community-post-detail-client";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { dashboardStudent } from "@/lib/student-dashboard-data";

// Conditional — see the matching note in /community/ask/page.tsx.
export function generateMetadata(): Metadata {
  return isFeatureEnabled("community") ? { title: "Community Post | Ensena" } : {};
}

// Brand-new route, no existing inbound links — 404s outright while
// Community is disabled, same reasoning as /community/ask/page.tsx.
export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isFeatureEnabled("community")) notFound();
  const { id } = await params;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <CommunityPostDetailClient id={id} viewerName={dashboardStudent.name} viewerRole="Student" />
      </main>
      <Footer />
    </div>
  );
}
