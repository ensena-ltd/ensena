import type { Metadata } from "next";

import { ProfileEditorClient } from "@/components/tutor-dashboard/profile/profile-editor-client";

export const metadata: Metadata = {
  title: "Edit Profile | Ensena Tutor Dashboard",
};

export default function ProfileEditPage() {
  return <ProfileEditorClient />;
}
