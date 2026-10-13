import { useEffect, useState } from "react";

export function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function slugifyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// A small, deterministic (not random) amount of minutes to shave off a
// present student's full attendance — real classroom presence always has
// some drift, but re-viewing the same session must always show the same
// number rather than a fresh random one on every render.
export function sessionAttendanceVariance(seed: string, maxMinutes: number): number {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 1000;
  return maxMinutes > 0 ? hash % maxMinutes : 0;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return h > 0 ? `${h.toString().padStart(2, "0")}:${m}:${sec}` : `${m}:${sec}`;
}

/**
 * Session-based countdown, matching Enseña's booking model (a lesson has a
 * fixed duration) rather than an open-ended elapsed-time call. Ticks down
 * from `totalMinutes` and reports when the lesson has ended.
 *
 * When `scheduledEndAtISO` is given (Discovery Classes only, currently — see
 * buildFromDiscovery), the countdown is computed against that real
 * wall-clock timestamp instead of "N minutes after this component happened
 * to mount." This is what makes a Discovery Session's 25-minute maximum a real
 * hard stop tied to its actual scheduled end time — rejoining, refreshing,
 * or a slow WebRTC handshake can't quietly grant extra time the way a
 * mount-relative timer would. Every other classroom kind omits this
 * parameter and keeps today's exact relative-countdown behavior.
 */
export function useLessonCountdown(totalMinutes: number, scheduledEndAtISO?: string): { label: string; ended: boolean } {
  const getRemaining = () =>
    scheduledEndAtISO ? Math.max(0, Math.round((new Date(scheduledEndAtISO).getTime() - Date.now()) / 1000)) : totalMinutes * 60;
  const [remaining, setRemaining] = useState(getRemaining);
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(scheduledEndAtISO ? getRemaining() : (s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- totalMinutes/getRemaining are re-derived from scheduledEndAtISO each tick; only a genuine identity change in the timestamp itself should restart the interval
  }, [scheduledEndAtISO]);
  return { label: formatClock(remaining), ended: remaining <= 0 };
}
