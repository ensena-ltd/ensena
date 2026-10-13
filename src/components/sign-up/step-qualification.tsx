"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ComboboxField } from "@/components/sign-up/combobox-field";
import { OptionCard } from "@/components/sign-up/option-card";
import { RequiredLabel } from "@/components/sign-up/required-label";
import { countryInfo } from "@/lib/geo-data";
import { fieldsOfStudyFor, institutionTypesFor, qualificationUsesInstitutionList, type InstitutionType } from "@/lib/tutor-signup-catalog";
import { academicStatusOptions, highestQualificationOptions, type TutorSignupForm } from "@/lib/tutor-signup-data";

type Institution = { n: string; t: InstitutionType };

// Institutions for the country picked on Step 2 come from /api/institutions
// (loaded once per country). Diploma lists universities, polytechnics and
// colleges of education; Bachelor's/Master's/PhD list universities. Field of
// study follows the kind of institution picked. Both fields accept "Other".
export function StepQualification({
  form,
  update,
  stepLabel = "Step 3 of 4",
}: {
  form: TutorSignupForm;
  update: (patch: Partial<TutorSignupForm>) => void;
  stepLabel?: string;
}) {
  const statusLabel = (status: string) => (status === "Currently In Progress" ? "Currently studying" : status);
  const hasCountryList = !!countryInfo(form.country);
  const usesList = qualificationUsesInstitutionList(form.highestQualification) && hasCountryList;

  const [loaded, setLoaded] = useState<{ country: string; list: Institution[] } | null>(null);
  const loading = usesList && loaded?.country !== form.country;

  useEffect(() => {
    if (!usesList || loaded?.country === form.country) return;
    let cancelled = false;
    fetch(`/api/institutions?country=${encodeURIComponent(form.country)}`)
      .then((r) => r.json() as Promise<{ institutions: Institution[] }>)
      .then((body) => {
        if (!cancelled) setLoaded({ country: form.country, list: body.institutions ?? [] });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ country: form.country, list: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [usesList, form.country, loaded?.country]);

  const institutionOptions = useMemo(() => {
    if (!usesList || loaded?.country !== form.country) return [];
    const types = institutionTypesFor(form.highestQualification);
    return loaded.list.filter((i) => types.includes(i.t)).map((i) => i.n);
  }, [usesList, loaded, form.country, form.highestQualification]);

  const institutionType = loaded?.list.find((i) => i.n === form.gradInstitution)?.t ?? null;
  const fieldOptions = fieldsOfStudyFor(form.highestQualification, institutionType);

  return (
    <div>
      <p className="text-sm font-semibold text-ensena-primary">{stepLabel}</p>
      <h2 className="mt-1 font-heading text-2xl font-semibold text-ensena-ink">
        Qualification
      </h2>
      <p className="mt-1 text-ensena-muted">
        Ensena uses this to verify tutors and match students with the right expertise.
      </p>

      <div className="mt-6">
        <RequiredLabel>Highest qualification</RequiredLabel>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {highestQualificationOptions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => q !== form.highestQualification && update({ highestQualification: q, gradInstitution: "", gradFieldOfStudy: "" })}
              className={`rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-colors ${
                form.highestQualification === q
                  ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                  : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-1.5">
        <RequiredLabel>Institution</RequiredLabel>
        {usesList ? (
          <>
            <ComboboxField
              key={`${form.country}-${form.highestQualification}`}
              value={form.gradInstitution}
              onChange={(v) => update({ gradInstitution: v, gradFieldOfStudy: "" })}
              options={institutionOptions}
              loading={loading}
              placeholder={`Search institutions in ${form.country}`}
              emptyHint={`We don't have a list for ${form.country} yet. Choose Other to type it.`}
            />
            <span className="text-xs text-ensena-muted">
              {form.highestQualification === "Diploma" ? "Universities, polytechnics and colleges of education" : "Universities"} in {form.country}. Not listed? Choose Other.
            </span>
          </>
        ) : (
          <Input
            value={form.gradInstitution}
            onChange={(e) => update({ gradInstitution: e.target.value })}
            placeholder={form.highestQualification === "Secondary School" ? "e.g. Kings College, Lagos" : "e.g. University of Lagos"}
            className="h-11 rounded-xl border-ensena-border"
          />
        )}
        {!form.highestQualification && <span className="text-xs text-ensena-muted">Choose your highest qualification first.</span>}
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <RequiredLabel>{form.highestQualification === "Secondary School" ? "Class / stream" : "Field of study"}</RequiredLabel>
        <ComboboxField
          key={`${form.highestQualification}-${institutionType ?? "any"}`}
          value={form.gradFieldOfStudy}
          onChange={(v) => update({ gradFieldOfStudy: v })}
          options={fieldOptions}
          placeholder="Search e.g. Mathematics, Computer Science"
          disabled={!form.highestQualification}
        />
      </div>

      <div className="mt-6">
        <RequiredLabel>Qualification status</RequiredLabel>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {academicStatusOptions.map((status) => (
            <OptionCard
              key={status}
              label={statusLabel(status)}
              selected={form.academicStatus === status}
              onClick={() => update({ academicStatus: status })}
            />
          ))}
        </div>
      </div>

      <p className="mt-6 flex items-start gap-2 text-xs text-ensena-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ensena-primary" />
        For Masters and PhD tutoring specifically, Ensena verifies this qualification before those
        services go live on your profile. You can upload supporting documents later from your dashboard.
      </p>
    </div>
  );
}
