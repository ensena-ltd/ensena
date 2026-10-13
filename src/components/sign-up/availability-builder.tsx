"use client";

import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { dayLabels, type AvailabilityDay } from "@/lib/tutor-signup-data";

type AvailabilityMap = Record<(typeof dayLabels)[number], AvailabilityDay>;

export function AvailabilityBuilder({
  availability,
  onChange,
}: {
  availability: AvailabilityMap;
  onChange: (next: AvailabilityMap) => void;
}) {
  const updateDay = (day: (typeof dayLabels)[number], patch: Partial<AvailabilityDay>) => {
    onChange({ ...availability, [day]: { ...availability[day], ...patch } });
  };

  const updateRange = (
    day: (typeof dayLabels)[number],
    index: number,
    patch: Partial<{ start: string; end: string }>
  ) => {
    const ranges = availability[day].ranges.map((r, i) => (i === index ? { ...r, ...patch } : r));
    updateDay(day, { ranges });
  };

  const addRange = (day: (typeof dayLabels)[number]) => {
    updateDay(day, {
      ranges: [...availability[day].ranges, { start: "10:00", end: "18:00" }],
    });
  };

  const removeRange = (day: (typeof dayLabels)[number], index: number) => {
    updateDay(day, { ranges: availability[day].ranges.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col divide-y divide-ensena-border rounded-xl border border-ensena-border">
      {dayLabels.map((day) => {
        const dayData = availability[day];
        return (
          <div key={day} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
            <label className="flex w-32 shrink-0 items-center gap-2 text-sm font-medium text-ensena-ink">
              <input
                type="checkbox"
                checked={dayData.enabled}
                onChange={(e) => updateDay(day, { enabled: e.target.checked })}
                className="size-4 accent-ensena-primary"
              />
              {day}
            </label>

            {dayData.enabled ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {dayData.ranges.map((range, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      type="time"
                      value={range.start}
                      onChange={(e) => updateRange(day, i, { start: e.target.value })}
                      className="h-9 w-36 rounded-lg border-ensena-border text-sm"
                    />
                    <span className="text-ensena-muted">–</span>
                    <Input
                      type="time"
                      value={range.end}
                      onChange={(e) => updateRange(day, i, { end: e.target.value })}
                      className="h-9 w-36 rounded-lg border-ensena-border text-sm"
                    />
                    <button
                      type="button"
                      aria-label="Remove time range"
                      onClick={() => removeRange(day, i)}
                      className="flex size-7 items-center justify-center rounded-lg text-ensena-muted hover:bg-ensena-bg-soft hover:text-red-500"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addRange(day)}
                  aria-label={`Add time range for ${day}`}
                  className="flex size-7 items-center justify-center rounded-lg border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            ) : (
              <span className="flex-1 text-sm text-ensena-muted">Unavailable</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
