import type { Metadata } from "next";

import { ResourcesClient } from "@/components/tutor-dashboard/resources/resources-client";

export const metadata: Metadata = {
  title: "Resources | Ensena Tutor Dashboard",
};

export default function ResourcesPage() {
  return <ResourcesClient />;
}
