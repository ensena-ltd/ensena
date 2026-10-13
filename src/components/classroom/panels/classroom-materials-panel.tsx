import { FileImage, FileText, Plus } from "lucide-react";

import type { ClassroomRole } from "@/lib/classroom-data";
import { cn } from "@/lib/utils";

function fileIconFor(name: string): { icon: typeof FileText; bg: string; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) return { icon: FileImage, bg: "bg-emerald-400/15", color: "text-emerald-400" };
  if (["doc", "docx"].includes(ext)) return { icon: FileText, bg: "bg-sky-400/15", color: "text-sky-400" };
  return { icon: FileText, bg: "bg-rose-400/15", color: "text-rose-400" };
}

export function ClassroomMaterialsPanel({
  role,
  materials,
  onOpen,
  onAdd,
}: {
  role: ClassroomRole;
  materials: string[];
  onOpen: (name: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex size-full flex-col gap-3 overflow-y-auto p-4">
      {role === "tutor" && (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
        >
          <Plus className="size-3.5" /> Add Resource
        </button>
      )}

      {materials.length === 0 ? (
        <p className="text-sm text-white/50">
          {role === "tutor" ? "No resources shared yet. Add a worksheet, notes, or a PDF for your student." : "No resources shared for this class yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {materials.map((name) => {
            const { icon: Icon, bg, color } = fileIconFor(name);
            return (
              <li key={name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", bg, color)}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{name}</span>
                <button
                  type="button"
                  onClick={() => onOpen(name)}
                  className="h-8 shrink-0 rounded-full border border-white/15 px-3 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Open
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
