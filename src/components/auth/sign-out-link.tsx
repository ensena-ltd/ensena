"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// Every "Log out" link in the app. Goes to /logout, which signs out of
// Supabase (browser + server), clears the local student/tutor/admin
// sessions and lands on /sign-in with a toast. `onBeforeNavigate` preserves
// each call site's own side effect (e.g. closing a menu).
export function SignOutLink({
  className,
  onBeforeNavigate,
  children,
}: {
  className?: string;
  onBeforeNavigate?: () => void;
  children: ReactNode;
}) {
  return (
    <Link href="/logout" prefetch={false} className={className} onClick={onBeforeNavigate}>
      {children}
    </Link>
  );
}
