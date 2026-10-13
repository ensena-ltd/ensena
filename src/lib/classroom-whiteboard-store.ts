"use client";

// Whiteboard persistence for the Ensena Classroom — localStorage-backed,
// same idiom as every other store in this app, keyed by classroomId (see
// ClassroomSession.classroomId) so the SAME lesson's whiteboard is found
// again after a refresh, a reconnect, or reopening the lesson later from
// Previous Lessons. Supports multiple named boards per classroom
// (boardKey, default: "default") for the "multiple pages" requirement.
//
// When a real Supabase project is connected (isSupabaseConfigured()), reads
// and writes ALSO go to the real whiteboard_documents table (see
// supabase/migrations/0003_classroom.sql) — best-effort, never blocking the
// local save, since the local copy is what guarantees "never lose content
// on refresh" regardless of network state.
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface WhiteboardFile {
  id: string;
  dataURL: string;
  mimeType: string;
  created: number;
}

export interface WhiteboardSceneData {
  elements: readonly unknown[];
  appState: Record<string, unknown>;
  /** Images referenced by `elements` (e.g. an uploaded worksheet) — persisted alongside the scene so reopening the lesson (or a remote peer loading it fresh) still has the actual image data, not just a dangling reference. */
  files?: WhiteboardFile[];
}

export interface StoredWhiteboardBoard {
  sceneData: WhiteboardSceneData;
  updatedAt: string;
}

// The granular whiteboard permission mode a tutor can set for a group (or
// private) class — "Tutor Only"/"Everyone" are the same two states
// `studentEditingEnabled` always represented; "Selected Students" and
// "Activity Mode" are new. `studentEditingEnabled` itself is kept as a
// derived legacy field (true for "everyone"/"activity", false otherwise) so
// the existing Supabase `classroom_sessions.student_editing_enabled` column
// keeps working unchanged — the richer mode/selection only syncs over the
// realtime transport and localStorage in this pass, not to that remote
// schema (a real DB migration is out of scope without a connected project
// to design and verify it against).
export type WhiteboardPermissionMode = "tutor-only" | "everyone" | "selected" | "activity";

export interface ClassroomWhiteboardRecord {
  studentEditingEnabled: boolean;
  permissionMode: WhiteboardPermissionMode;
  /** Real display names (the one identity this app already keys shared per-student state by) of the students permitted to interact when permissionMode is "selected". */
  selectedStudentNames: string[];
  boards: Record<string, StoredWhiteboardBoard>;
  boardOrder: string[];
}

const EMPTY_SCENE: WhiteboardSceneData = { elements: [], appState: {} };
const DEFAULT_BOARD_KEY = "default";

function keyFor(classroomId: string): string {
  return `ensena_classroom_whiteboard:${classroomId}`;
}

function emptyRecord(): ClassroomWhiteboardRecord {
  return { studentEditingEnabled: true, permissionMode: "everyone", selectedStudentNames: [], boards: {}, boardOrder: [DEFAULT_BOARD_KEY] };
}

function readRecord(classroomId: string): ClassroomWhiteboardRecord {
  if (typeof window === "undefined") return emptyRecord();
  try {
    const raw = window.localStorage.getItem(keyFor(classroomId));
    if (!raw) return emptyRecord();
    const parsed = JSON.parse(raw) as Partial<ClassroomWhiteboardRecord>;
    return {
      studentEditingEnabled: parsed.studentEditingEnabled ?? true,
      permissionMode: parsed.permissionMode ?? (parsed.studentEditingEnabled === false ? "tutor-only" : "everyone"),
      selectedStudentNames: parsed.selectedStudentNames ?? [],
      boards: parsed.boards ?? {},
      boardOrder: parsed.boardOrder?.length ? parsed.boardOrder : [DEFAULT_BOARD_KEY],
    };
  } catch {
    return emptyRecord();
  }
}

function writeRecord(classroomId: string, record: ClassroomWhiteboardRecord): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyFor(classroomId), JSON.stringify(record));
}

export function getWhiteboardBoard(classroomId: string, boardKey: string = DEFAULT_BOARD_KEY): WhiteboardSceneData {
  return readRecord(classroomId).boards[boardKey]?.sceneData ?? EMPTY_SCENE;
}

export function getWhiteboardBoardOrder(classroomId: string): string[] {
  return readRecord(classroomId).boardOrder;
}

// The most recent `updatedAt` across every saved board — real evidence of
// "when was the whiteboard last touched," used by the admin lesson-evidence
// view. Only a snapshot timestamp per board exists (see the module doc
// comment above), never a stroke-by-stroke log, so this is the most precise
// answer available, not an approximation of something finer-grained.
export function getWhiteboardLastUpdatedISO(classroomId: string): string | null {
  const boards = Object.values(readRecord(classroomId).boards);
  if (boards.length === 0) return null;
  return boards.reduce<string | null>((latest, b) => (!latest || b.updatedAt > latest ? b.updatedAt : latest), null);
}

// How many boards actually have saved content — NOT `boardOrder.length`,
// which always includes a default board key even when the whiteboard was
// never opened (readRecord seeds `boardOrder: [DEFAULT_BOARD_KEY]` before
// anything is ever saved into `boards`). Counting the real `boards` map is
// what tells "used" from "never touched."
export function getWhiteboardUsedBoardCount(classroomId: string): number {
  return Object.keys(readRecord(classroomId).boards).length;
}

export function getWhiteboardPermission(classroomId: string): { mode: WhiteboardPermissionMode; selectedStudentNames: string[] } {
  const record = readRecord(classroomId);
  return { mode: record.permissionMode, selectedStudentNames: record.selectedStudentNames };
}

export function setWhiteboardPermission(classroomId: string, mode: WhiteboardPermissionMode, selectedStudentNames: string[]): void {
  const record = readRecord(classroomId);
  record.permissionMode = mode;
  record.selectedStudentNames = selectedStudentNames;
  record.studentEditingEnabled = mode === "everyone" || mode === "activity";
  writeRecord(classroomId, record);
}

export function saveWhiteboardBoard(classroomId: string, boardKey: string, sceneData: WhiteboardSceneData): void {
  const record = readRecord(classroomId);
  record.boards[boardKey] = { sceneData, updatedAt: new Date().toISOString() };
  if (!record.boardOrder.includes(boardKey)) record.boardOrder.push(boardKey);
  writeRecord(classroomId, record);

  if (isSupabaseConfigured()) {
    void mirrorSaveToSupabase(classroomId, boardKey, sceneData);
  }
}

export function addWhiteboardBoard(classroomId: string): string {
  const record = readRecord(classroomId);
  const nextKey = `board-${record.boardOrder.length + 1}`;
  record.boardOrder.push(nextKey);
  record.boards[nextKey] = { sceneData: EMPTY_SCENE, updatedAt: new Date().toISOString() };
  writeRecord(classroomId, record);
  return nextKey;
}

// Best-effort mirror to the real backend once one is connected — resolves
// (or gets/creates) the classroom_sessions row for this lesson, then
// upserts the scene into whiteboard_documents. Never throws into the
// caller: a failed mirror still leaves the authoritative local save intact,
// consistent with "never lose the board because of a network blip."
async function mirrorSaveToSupabase(classroomId: string, boardKey: string, sceneData: WhiteboardSceneData): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: session } = await supabase
      .from("classroom_sessions")
      .select("id")
      .eq("lesson_id", classroomId)
      .maybeSingle();
    if (!session) return; // Session row is created by getOrCreateClassroomSession() when the classroom is opened, not here.

    await supabase.from("whiteboard_documents").upsert(
      { classroom_session_id: session.id, board_key: boardKey, scene_data: sceneData, updated_by: user.id },
      { onConflict: "classroom_session_id,board_key" }
    );
  } catch {
    // Silently skip — see doc comment above.
  }
}

// Ensures a real classroom_sessions row exists for this lesson (idempotent
// upsert on the unique lesson_id) and loads its currently-saved board, if
// any — called once when the Ensena Classroom is opened and Supabase is
// configured, so a real backend takes over as the source of truth instead
// of (rather than in addition to) localStorage.
export async function getOrCreateRemoteClassroomSession(input: {
  classroomId: string;
  subject: string;
  title: string;
  role: "tutor" | "student";
}): Promise<{ sessionId: string; studentEditingEnabled: boolean } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const existing = await supabase.from("classroom_sessions").select("id, student_editing_enabled").eq("lesson_id", input.classroomId).maybeSingle();
    if (existing.data) return { sessionId: existing.data.id, studentEditingEnabled: existing.data.student_editing_enabled };

    // Only the tutor's side creates the session row (RLS's insert policy
    // for classroom_sessions is tutor-only by design) — a student opening
    // the classroom before the tutor has started it simply sees "waiting
    // for your tutor to start the classroom" from the calling hook.
    if (input.role !== "tutor") return null;

    const created = await supabase
      .from("classroom_sessions")
      .insert({ lesson_id: input.classroomId, tutor_id: user.id, subject: input.subject, title: input.title, started_at: new Date().toISOString() })
      .select("id, student_editing_enabled")
      .single();
    if (created.error || !created.data) return null;
    return { sessionId: created.data.id, studentEditingEnabled: created.data.student_editing_enabled };
  } catch {
    return null;
  }
}

export async function loadRemoteWhiteboardBoard(sessionId: string, boardKey: string): Promise<WhiteboardSceneData | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from("whiteboard_documents").select("scene_data").eq("classroom_session_id", sessionId).eq("board_key", boardKey).maybeSingle();
    return (data?.scene_data as WhiteboardSceneData) ?? null;
  } catch {
    return null;
  }
}

export async function setRemoteStudentEditingEnabled(sessionId: string, enabled: boolean): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    await supabase.from("classroom_sessions").update({ student_editing_enabled: enabled }).eq("id", sessionId);
  } catch {
    // Best-effort — the real-time WhiteboardPermissionEvent (classroom-sync.ts) already reflects it for this session; this is only the legacy boolean mirror for the remote schema.
  }
}

export async function endRemoteClassroomSession(sessionId: string): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    await supabase.from("classroom_sessions").update({ ended_at: new Date().toISOString() }).eq("id", sessionId);
  } catch {
    // Best-effort.
  }
}

export { DEFAULT_BOARD_KEY };
