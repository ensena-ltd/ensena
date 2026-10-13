import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordClient } from "./reset-password-client";

export const metadata: Metadata = {
  title: "Reset Password | Ensena",
  description: "Create a new password for your Ensena account.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordClient />
    </Suspense>
  );
}
