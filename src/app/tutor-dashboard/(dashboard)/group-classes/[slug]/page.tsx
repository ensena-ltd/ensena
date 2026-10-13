import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GroupClassDetailClient } from "@/components/tutor-dashboard/group-classes/group-class-detail-client";
import { GroupClassDetailReal } from "@/components/tutor-dashboard/live/group-class-detail-real";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";
import { initialMyGroupClasses } from "@/lib/tutor-dashboard-data";
import { loadTutorTeaching } from "@/lib/tutor-teaching-server";

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function findBySlug(slug: string) {
  return initialMyGroupClasses.find((c) => slugify(c.title) === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const groupClass = findBySlug(slug);
  return { title: groupClass ? `${groupClass.title} | Ensena Tutor Dashboard` : "Group Class | Ensena Tutor Dashboard" };
}

export default async function GroupClassDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (isSupabaseConfigured()) {
    const profile = await requireRole("tutor");
    if (profile) {
      const data = await loadTutorTeaching(profile.id);
      const groupClass = data.groupClasses.find((c) => c.slug === slug);
      if (!groupClass) notFound();
      return <GroupClassDetailReal groupClass={groupClass} approved={data.approved} generatedAtMs={data.generatedAtMs} />;
    }
  }
  const groupClass = findBySlug(slug);
  if (!groupClass) notFound();
  return <GroupClassDetailClient groupClass={groupClass} />;
}
