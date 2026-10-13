import type { Metadata } from "next";

import { ApplicationStatusClient } from "./application-status-client";

export const metadata: Metadata = {
  title: "Application Status | Ensena Tutor Dashboard",
};

export default function ApplicationStatusPage() {
  return <ApplicationStatusClient />;
}
