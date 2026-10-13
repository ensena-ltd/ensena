"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenCheck, Check, GraduationCap, Search, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { researchFields, servicesForLevel, type MastersPhdLevel } from "@/lib/academic-taxonomy-data";
import type { PreferredExpertLevel } from "@/lib/academic-matching";
import { cn } from "@/lib/utils";

const OTHER_FIELD = "other";

function preferredExpertOptions(academicLevel: MastersPhdLevel): { value: PreferredExpertLevel; label: string }[] {
  const base: { value: PreferredExpertLevel; label: string }[] =
    academicLevel === "Masters"
      ? [
          { value: "masters-student", label: "Master's student" },
          { value: "masters-holder", label: "Master's holder" },
          { value: "phd-student", label: "PhD student" },
          { value: "phd-holder", label: "PhD holder" },
        ]
      : [
          { value: "phd-student", label: "PhD student" },
          { value: "phd-holder", label: "PhD holder" },
        ];
  return [...base, { value: "no-preference", label: "No preference" }];
}

export function ResearchExpertFlow({ academicLevel }: { academicLevel: MastersPhdLevel }) {
  const router = useRouter();

  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [customField, setCustomField] = useState("");
  const [department, setDepartment] = useState("");
  const [researchAreaText, setResearchAreaText] = useState("");
  const [preferredExpert, setPreferredExpert] = useState<PreferredExpertLevel>("no-preference");

  const services = servicesForLevel(academicLevel);
  const fields = researchFields.filter((f) => f.active).sort((a, b) => a.order - b.order);

  const canSubmit = serviceIds.length > 0 && (fieldId === OTHER_FIELD ? customField.trim().length > 0 : !!fieldId);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function goToResults() {
    const params = new URLSearchParams({ academicLevel: academicLevel.toLowerCase() });
    if (serviceIds.length > 0) params.set("serviceIds", serviceIds.join(","));
    if (fieldId && fieldId !== OTHER_FIELD) params.set("fieldId", fieldId);
    if (fieldId === OTHER_FIELD && customField.trim()) params.set("customField", customField.trim());
    if (department.trim()) params.set("department", department.trim());
    if (researchAreaText.trim()) params.set("researchAreaText", researchAreaText.trim());
    if (preferredExpert !== "no-preference") params.set("preferredExpert", preferredExpert);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[860px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink sm:text-3xl">Find a Research Expert</h1>
        <p className="mt-2 max-w-xl text-sm text-ensena-muted sm:text-base">
          Get one-on-one support from a qualified {academicLevel === "Masters" ? "Master's or PhD-level" : "PhD-level"} expert in your field.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ensena-success">
          <ShieldCheck className="size-4" /> All experts are verified
        </p>
      </div>

      {/* Decorative progress indicator — the form below is a single page, not click-through steps. */}
      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-ensena-border bg-ensena-surface p-4 text-xs sm:text-sm">
        {[
          { n: 1, label: "Your needs" },
          { n: 2, label: "Your field" },
          { n: 3, label: "Find experts" },
        ].map((step, i, arr) => (
          <div key={step.n} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold sm:size-7",
                step.n < 3 ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-muted"
              )}
            >
              {step.n}
            </span>
            <span className="hidden font-medium text-ensena-ink sm:inline">{step.label}</span>
            {i < arr.length - 1 && <span className="h-px flex-1 bg-ensena-border" />}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <section>
          <h2 className="text-sm font-semibold text-ensena-ink">1. What do you need help with?</h2>
          <p className="text-xs text-ensena-muted">Select one or more</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {services.map((s) => {
              const selected = serviceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    "relative flex min-h-[92px] flex-col items-start justify-center gap-1.5 rounded-2xl border p-3.5 text-left transition-all",
                    selected ? "border-ensena-primary bg-ensena-primary/5 ring-1 ring-ensena-primary/30" : "border-ensena-border bg-ensena-surface hover:border-ensena-primary/30"
                  )}
                >
                  <span
                    className={cn(
                      "absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full border",
                      selected ? "border-ensena-primary bg-ensena-primary text-white" : "border-ensena-border"
                    )}
                  >
                    {selected && <Check className="size-2.5" />}
                  </span>
                  <BookOpenCheck className="size-4 text-ensena-primary" />
                  <span className="text-sm font-semibold text-ensena-ink">{s.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ensena-ink">2. What&apos;s your field of {academicLevel === "PhD" ? "research" : "study"}?</h2>
          <p className="text-xs text-ensena-muted">Choose your academic field</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {fields.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFieldId(f.id)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                  fieldId === f.id ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                )}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFieldId(OTHER_FIELD)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                fieldId === OTHER_FIELD ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              Other
            </button>
          </div>
          {fieldId === OTHER_FIELD && (
            <Input
              value={customField}
              onChange={(e) => setCustomField(e.target.value)}
              placeholder="Type your field of study"
              className="mt-3 h-11 max-w-sm rounded-xl border-ensena-border"
            />
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold text-ensena-ink">3. Department or programme <span className="font-normal text-ensena-muted">(optional)</span></h2>
            <p className="text-xs text-ensena-muted">E.g. Computer Science, Civil Engineering</p>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Enter your department or programme" className="mt-2 h-11 rounded-xl border-ensena-border" />
          </section>
          <section>
            <h2 className="text-sm font-semibold text-ensena-ink">4. What&apos;s your research area? <span className="font-normal text-ensena-muted">(optional)</span></h2>
            <p className="text-xs text-ensena-muted">E.g. Artificial Intelligence, Renewable Energy</p>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
              <Input value={researchAreaText} onChange={(e) => setResearchAreaText(e.target.value)} placeholder="Enter your research area" className="h-11 rounded-xl border-ensena-border pl-9" />
            </div>
          </section>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-ensena-ink">5. Who would you like to work with?</h2>
          <p className="text-xs text-ensena-muted">Choose your preferred expert level</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {preferredExpertOptions(academicLevel).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPreferredExpert(opt.value)}
                className={cn(
                  "flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center text-xs font-semibold transition-all",
                  preferredExpert === opt.value ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                )}
              >
                <GraduationCap className="size-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={goToResults}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ensena-primary text-base font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            Find Research Experts <ArrowRight className="size-4" />
          </button>
          <p className="mt-2 text-center text-xs text-ensena-muted">You can change your preferences anytime.</p>
        </div>
      </div>
    </div>
  );
}
