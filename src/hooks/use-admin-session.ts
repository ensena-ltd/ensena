"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

import { defaultSuperAdminSession, getCurrentAdminSession, type AdminSession } from "@/lib/admin-session";

// The signed-in admin as resolved on the server (admin layout ->
// AdminSessionSync). Used as the starting value so the very first render —
// including the server-rendered HTML — shows the real admin rather than the
// demo persona while the localStorage copy catches up.
export const ServerAdminSessionContext = createContext<AdminSession | null>(null);

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("ensena:admin-session-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("ensena:admin-session-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

export function useAdminSession(): AdminSession {
  const server = useContext(ServerAdminSessionContext);
  return useSyncExternalStore(
    subscribe,
    () => {
      const current = getCurrentAdminSession();
      // Nothing stored yet (or a different account's leftover) — trust the server.
      return server && (current === defaultSuperAdminSession || current.userId !== server.userId) ? server : current;
    },
    () => server ?? defaultSuperAdminSession
  );
}
