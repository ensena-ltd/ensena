"use client";

import { useEffect, useState } from "react";

import { calendarViewDate } from "@/lib/tutor-dashboard-data";
import { getPlatformTodayParts } from "@/lib/platform-time";

function platformTodayISO(): string {
  const { year, month, day } = getPlatformTodayParts();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Starts at the fixed SSR-safe placeholder so the server render and the
// client's first render match exactly (same pattern as useSavedTutor); the
// real "today" is only knowable client-side, so it's applied here, post-mount.
//
// Uses Africa/Lagos (see platform-time.ts), never the browser's own local
// date — this hook feeds group-class session/week status calculations
// broadly across the app (buildGroupClassCohorts, buildGroupSessionSchedule,
// etc.), so a viewer in a different timezone must never see a different
// "today" than Enseña's own platform clock.
export function useTodayISO(): string {
  const [todayISO, setTodayISO] = useState(calendarViewDate);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayISO(platformTodayISO());
  }, []);

  return todayISO;
}
