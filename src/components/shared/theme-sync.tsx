"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { applyTheme, readThemeCookie, writeThemeCookie, type ThemePreference } from "@/lib/theme";

// Re-applies the theme on client-side navigation (dashboard ↔ public site)
// and when the OS switches light/dark while "System" is selected.
// `accountTheme` (from account_settings, passed by a dashboard layout) wins
// over this browser's cookie, so the choice follows the account to new
// devices.
export function ThemeSync({ accountTheme }: { accountTheme?: ThemePreference | null }) {
  const pathname = usePathname();

  useEffect(() => {
    if (accountTheme && accountTheme !== readThemeCookie()) writeThemeCookie(accountTheme);
    applyTheme(readThemeCookie(), pathname);
  }, [pathname, accountTheme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return null;
}
