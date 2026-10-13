"use client";

import { useSyncExternalStore } from "react";

import { getAllAttendance, getAttendance, subscribeAttendance, type AttendanceRecord } from "@/lib/class-attendance-store";

// Server snapshot pinned to an empty array — same hydration-safety
// reasoning as every other store hook in this app (localStorage doesn't
// exist server-side, and a real attendance record is only ever knowable
// client-side once someone has actually visited the classroom).
function getServerSnapshot(): AttendanceRecord[] {
  return [];
}

export function useAttendance(classroomId: string): AttendanceRecord[] {
  return useSyncExternalStore(subscribeAttendance, () => getAttendance(classroomId), getServerSnapshot);
}

// For a caller checking many classroomIds at once (e.g. every row in a
// list) — one subscription instead of one hook call per row, which a
// .map()/.forEach() loop can't do without breaking the Rules of Hooks.
// Filter the result with a plain classroomId === check per item.
export function useAllAttendance(): AttendanceRecord[] {
  return useSyncExternalStore(subscribeAttendance, getAllAttendance, getServerSnapshot);
}
