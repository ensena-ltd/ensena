// The ONE calendar-week calculation used everywhere a session gets grouped
// into "Week 1 / Week 2 / ...": private-lesson booking (numberSchedule),
// group-class enrollment scheduling (buildGroupSessionSchedule), and the
// tutor's Manage Class sessions tab (previously its own local
// sessionWeekNumber). All three used to duplicate this exact formula —
// harmless while every one of them happened to be correct, but a real risk
// that a future edit to just one of them would silently reintroduce a
// "different screens show different week numbers" bug. There is now exactly
// one place this is computed.
//
// A session's week number is how many real 7-day blocks separate it from
// the programme's own start date — never array position, never "days since
// today". Every caller's date-generation loop only ever walks forward from
// that same start date, so `daysSince` is mathematically always >= 0; the
// Math.max(1, ...) clamp below is deliberate defense-in-depth (per the
// product rule "there is no such thing as Week 0") rather than something
// expected to ever trigger.
export function computeWeekNumber(startDateISO: string, targetDateISO: string): number {
  const [sy, sm, sd] = startDateISO.split("-").map(Number);
  const [ty, tm, td] = targetDateISO.split("-").map(Number);
  const startUTC = Date.UTC(sy, sm - 1, sd);
  const targetUTC = Date.UTC(ty, tm - 1, td);
  const daysSince = Math.round((targetUTC - startUTC) / 86_400_000);
  return Math.max(1, Math.floor(daysSince / 7) + 1);
}

// Date-object overload for callers that already work in `Date` (rather than
// "yyyy-mm-dd" strings) — converts via local Y/M/D fields so it agrees with
// computeWeekNumber for the same calendar day regardless of time-of-day.
export function computeWeekNumberFromDates(startDate: Date, targetDate: Date): number {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return computeWeekNumber(iso(startDate), iso(targetDate));
}
