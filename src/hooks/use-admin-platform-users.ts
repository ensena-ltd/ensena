"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  getInvitations,
  getPlatformUsers,
  seedInvitations,
  seedPlatformUsers,
  subscribePlatformUsers,
  type PlatformInvitation,
  type PlatformUserAccount,
} from "@/lib/admin-platform-users-store";
import { fetchPlatformUsersAndInvitations } from "@/lib/staff-directory-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const supabaseConfigured = isSupabaseConfigured();

// Once configured, real Platform Users/invitations come from Supabase
// instead of localStorage (see staff-directory-client.ts) — that's a plain
// async fetch, not a subscribable store, so callers that mutate (invite,
// resend, revoke, suspend, edit access — all in src/lib/actions/staff.ts)
// must call the returned `refresh()` afterward instead of relying on an
// automatic localStorage-change event the way the demo path still does.
export function useAdminPlatformUsers(): { users: PlatformUserAccount[]; invitations: PlatformInvitation[]; loading: boolean; refresh: () => void } {
  const demoUsers = useSyncExternalStore(subscribePlatformUsers, getPlatformUsers, () => seedPlatformUsers);
  const demoInvitations = useSyncExternalStore(subscribePlatformUsers, getInvitations, () => seedInvitations);

  const [real, setReal] = useState<{ users: PlatformUserAccount[]; invitations: PlatformInvitation[] } | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  const refresh = useCallback(() => {
    if (!supabaseConfigured) return;
    fetchPlatformUsersAndInvitations().then((data) => {
      setReal(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!supabaseConfigured) {
    return { users: demoUsers, invitations: demoInvitations, loading: false, refresh: () => {} };
  }

  return { users: real?.users ?? [], invitations: real?.invitations ?? [], loading, refresh };
}
