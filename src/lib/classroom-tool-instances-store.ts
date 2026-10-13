"use client";

// Persistence for Teaching Tool instances placed on a whiteboard (a Timer,
// Number Line, Coordinate Plane, etc.) — same localStorage-keyed-by-
// classroomId idiom as classroom-whiteboard-store.ts, so an activity a
// tutor set up survives a refresh/reconnect and is there again if the
// lesson is reopened later, exactly like the whiteboard scene itself.
//
// Scope note: unlike classroom-whiteboard-store.ts, this does NOT yet
// mirror to Supabase — there is no tool_instances table in this app's
// schema yet. Wiring one in is a straightforward follow-up (the read/write
// functions below are the one seam that would need it), not a redesign;
// disclosed here rather than silently pretending it's already backed by a
// real table.
import type { ToolInstance } from "@/lib/classroom-sync";

export type { ToolInstance } from "@/lib/classroom-sync";

function keyFor(classroomId: string, boardKey: string): string {
  return `ensena_classroom_tools:${classroomId}:${boardKey}`;
}

function readInstances(classroomId: string, boardKey: string): ToolInstance[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(classroomId, boardKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ToolInstance[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInstances(classroomId: string, boardKey: string, instances: ToolInstance[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyFor(classroomId, boardKey), JSON.stringify(instances));
}

export function getToolInstances(classroomId: string, boardKey: string): ToolInstance[] {
  return readInstances(classroomId, boardKey);
}

export function saveToolInstances(classroomId: string, boardKey: string, instances: ToolInstance[]): void {
  writeInstances(classroomId, boardKey, instances);
}
