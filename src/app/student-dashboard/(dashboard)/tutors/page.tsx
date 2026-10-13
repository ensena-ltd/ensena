import type { Metadata } from "next";

import { MyTutorsClient } from "@/components/student-dashboard/tutors/my-tutors-client";

export const metadata: Metadata = {
  title: "My Tutors | Ensena Student Dashboard",
};

export default function MyTutorsPage() {
  return <MyTutorsClient />;
}
