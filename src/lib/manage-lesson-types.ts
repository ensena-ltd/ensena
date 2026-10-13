import type { LucideIcon } from "lucide-react";

export type ManageLessonKind = "private" | "discovery" | "group";
export type ManageLessonRole = "student" | "tutor";

export interface ManageLessonAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "danger";
  disabled?: boolean;
}

export interface ManageLessonInfoRow {
  label: string;
  value: string;
}

export interface ManageLessonData {
  sheetTitle: string; // "Manage lesson" | "Manage discovery session" | "Manage class"
  title: string; // subject or class title
  subtitle?: string; // counterpart name (tutor or student) — omitted for group classes
  image?: string;
  statusLabel: string;
  bookingRef: string;
  infoRows: ManageLessonInfoRow[];
}
