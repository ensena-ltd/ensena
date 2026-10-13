"use client";

import { Toaster as SonnerToaster } from "sonner";

// Mounted once in the root layout. Every toast in the app — `toast` from
// "sonner" and the older showToast() helper (src/lib/toast-store.ts) —
// renders here.
export function Toaster() {
  return <SonnerToaster position="top-center" richColors closeButton toastOptions={{ className: "font-sans" }} />;
}
