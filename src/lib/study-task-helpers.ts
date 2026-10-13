// Shared by the Study Planner page and the condensed widget on the main My
// Classes page — both need to turn a task's dayOffset (0 = today) into a
// real, current date, computed off the hydration-safe useTodayISO() value
// rather than a hardcoded reference date.

export function dateFromOffset(todayISO: string, dayOffset: number): Date {
  const [y, m, d] = todayISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + dayOffset);
  return date;
}

export function dayLabel(todayISO: string, dayOffset: number): string {
  if (dayOffset === 0) return "Today";
  if (dayOffset === 1) return "Tomorrow";
  return dateFromOffset(todayISO, dayOffset).toLocaleDateString("en-US", { weekday: "long" });
}

export function fullDateLabel(todayISO: string, dayOffset: number): string {
  return dateFromOffset(todayISO, dayOffset).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
