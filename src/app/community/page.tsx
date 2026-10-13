import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CommunityFeedClient } from "@/components/community/community-feed-client";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { CommunityClient } from "./community-client";

export const metadata: Metadata = {
  title: "Community | Ensena",
  description: "How students and tutors learn together on Ensena through group classes and academic support.",
  alternates: { canonical: "/community" },
  openGraph: { title: "Community | Ensena", url: "/community" },
};

// This route already has real, live inbound links (Help Center "Join
// Community" cards, the sign-up chooser) pointing at today's simple
// marketing page below — so unlike the brand-new /community/ask and
// /community/post/[id] routes, disabling the feature here must NOT 404 an
// existing, working page. Instead it keeps rendering the legacy
// CommunityClient exactly as before; only once activated does this same
// URL switch to the real discussion feed, with zero change needed to any
// of those existing links.
export default function CommunityPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        {isFeatureEnabled("community") ? <CommunityFeedClient /> : <CommunityClient />}
      </main>
      <Footer />
    </div>
  );
}
