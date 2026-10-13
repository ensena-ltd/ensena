"use client";

import { useState } from "react";
import { Atom, Beaker, Microscope, Pause, Play, Redo2, Users } from "lucide-react";

import type { ClassroomLiveState } from "@/components/classroom/classroom-shell";
import type { ClassroomRole, ClassroomSession } from "@/lib/classroom-data";
import { OhmsLawLab } from "@/components/classroom/lab/ohms-law-lab";
import { cn } from "@/lib/utils";

type LabSubject = "Physics" | "Chemistry" | "Biology";

const SUBJECT_ICONS: Record<LabSubject, typeof Atom> = { Physics: Atom, Chemistry: Beaker, Biology: Microscope };

const EXPERIMENTS: Record<LabSubject, { title: string; description: string; built: boolean }> = {
  Physics: { title: "Ohm's Law – Simple Circuit", description: "Build the circuit and observe the relationship between voltage, current and resistance.", built: true },
  Chemistry: { title: "Acid + Base Reaction", description: "Mix substances and observe the resulting pH.", built: false },
  Biology: { title: "Microscope – Cell Structures", description: "Examine specimens and identify cell structures.", built: false },
};

// The "Lab" mode's stage content — the Virtual Laboratory, Enseña's actual
// classroom differentiator, gets to be the full main teaching area exactly
// like Whiteboard/Screen Share do, not a small panel squeezed in somewhere.
export function ClassroomLabSection({ role, session, state }: { role: ClassroomRole; session: ClassroomSession; state: ClassroomLiveState }) {
  const [subject, setSubject] = useState<LabSubject>(session.labSubject ?? "Physics");
  const experiment = EXPERIMENTS[subject];
  const ComingSoonIcon = SUBJECT_ICONS[subject];

  return (
    <div className="flex size-full flex-col overflow-y-auto bg-neutral-900 p-4">
      <div className="flex items-center gap-1.5">
        {(Object.keys(EXPERIMENTS) as LabSubject[]).map((s) => {
          const Icon = SUBJECT_ICONS[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSubject(s)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                subject === s ? "bg-violet-500/20 text-violet-300" : "text-white/50 hover:bg-white/10"
              )}
            >
              <Icon className="size-3.5" /> {s}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-white">{experiment.title}</p>
        <p className="text-xs text-white/50">{experiment.description}</p>
      </div>

      <div className="mt-3 flex-1 rounded-2xl bg-white p-4">
        {experiment.built ? (
          <OhmsLawLab />
        ) : (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ensena-border p-8 text-center">
            <ComingSoonIcon className="size-6 text-ensena-muted" />
            <p className="text-sm text-ensena-muted">{subject} experiments are coming soon.</p>
          </div>
        )}
      </div>

      {role === "tutor" && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
          <LabAction icon={Play} label="Start Experiment" onClick={() => state.showNotice("Experiment started for the class.")} />
          <LabAction icon={Users} label="Give Student Control" onClick={() => state.showNotice("Student can now control the experiment.")} />
          <LabAction icon={Pause} label="Pause" onClick={() => state.showNotice("Experiment paused.")} />
          <LabAction icon={Redo2} label="Show Solution" onClick={() => state.showNotice("Solution shown to the class.")} />
        </div>
      )}
    </div>
  );
}

function LabAction({ icon: Icon, label, onClick }: { icon: typeof Play; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-semibold text-white hover:bg-white/10"
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );
}
