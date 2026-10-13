"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { academicLevelFilterOptions } from "@/lib/group-classes-data";

const ALL_LEVELS = "Education Level";

export function GroupClassesHero({
  query,
  level,
  onQueryChange,
  onLevelChange,
}: {
  query: string;
  level: string;
  onQueryChange: (value: string) => void;
  onLevelChange: (value: string) => void;
}) {
  return (
    <section className="bg-ensena-bg-soft py-10">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-ensena-ink lg:text-4xl">
            Find the{" "}
            <span className="text-ensena-primary">perfect group class</span>
          </h1>
          <p className="mt-2 text-ensena-muted">
            Join small, interactive classes led by expert tutors and learn alongside other students.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-ensena-border bg-ensena-surface p-4 shadow-[0_20px_60px_-30px_rgba(17,24,39,0.25)] lg:flex-row lg:items-end">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ensena-muted">What do you want to learn?</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search subject, class or exam"
                aria-label="Search subject, class or exam"
                className="h-11 rounded-xl border-ensena-border pl-9 focus-visible:ring-ensena-primary/30"
              />
            </div>
          </label>

          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ensena-muted">Education Level</span>
            <Select value={level} onValueChange={(v) => onLevelChange(v ?? ALL_LEVELS)}>
              <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_LEVELS}>{ALL_LEVELS}</SelectItem>
                {academicLevelFilterOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <Button className="h-11 rounded-xl bg-ensena-primary px-8 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary/90">
            Search Classes
          </Button>
        </div>
      </div>
    </section>
  );
}

export { ALL_LEVELS };
