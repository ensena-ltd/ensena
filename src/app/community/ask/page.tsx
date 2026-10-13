import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CommunityAskClient } from "@/components/community/community-ask-client";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { dashboardStudent } from "@/lib/student-dashboard-data";

// Conditional so a disabled Community leaves no trace even in the <title>
// tag of the notFound() shell — a plain `export const metadata` would still
// render before the throw discards the rest of the page.
export function generateMetadata(): Metadata {
  return isFeatureEnabled("community") ? { title: "Ask the Community | Ensena" } : {};
}

// Brand-new route with no existing inbound links (unlike /community itself)
// — so while the feature is disabled, this 404s outright rather than
// rendering a legacy fallback. Manually typing the URL gets the same
// not-found page as any other nonexistent route.
export default function CommunityAskPage() {
  if (!isFeatureEnabled("community")) notFound();

  // Placeholder identity until this route is wired to a real session — see
  // the matching note in community-ask-client.tsx. Ensena has no real
  // cross-page login state today (the public Header doesn't track it
  // either), so this stands in for "the current student" the same way
  // dashboardStudent already does across the student dashboard.
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <CommunityAskClient authorName={dashboardStudent.name} authorRole="Student" />
      </main>
      <Footer />
    </div>
  );
}
