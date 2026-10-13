// Client-safe theme helpers (Settings → Theme). The choice is kept in the
// `ensena-theme` cookie (so it applies before first paint, via the inline
// script in src/app/layout.tsx) and in account_settings (so it follows the
// account to other devices). Dark mode only applies on the signed-in
// dashboards; the public site stays light.
export type ThemePreference = "light" | "dark" | "system";

export const THEME_COOKIE = "ensena-theme";

const DASHBOARD_PATH = /^\/(student-dashboard|tutor-dashboard|guardian-dashboard|counsellor-dashboard|admin)(\/|$)/;

export function readThemeCookie(): ThemePreference {
  if (typeof document === "undefined") return "light";
  const m = document.cookie.match(/(?:^|; )ensena-theme=(light|dark|system)/);
  return (m?.[1] as ThemePreference) ?? "light";
}

export function writeThemeCookie(theme: ThemePreference) {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax`;
}

export function applyTheme(theme: ThemePreference = readThemeCookie(), pathname = typeof location === "undefined" ? "/" : location.pathname) {
  if (typeof document === "undefined") return;
  const dark = DASHBOARD_PATH.test(pathname) && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));
  document.documentElement.classList.toggle("dark", dark);
}

// Inlined into <head> so the right theme is on <html> before the first paint
// (no flash of light mode). Keep in sync with applyTheme above.
export const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|; )ensena-theme=(light|dark|system)/);var t=m?m[1]:"light";var d=${DASHBOARD_PATH.toString()}.test(location.pathname)&&(t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches));if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
