"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";

import { AcademicTutorResultCard } from "@/components/find-teachers/browse/academic-tutor-result-card";
import {
  courseById,
  departmentById,
  facultyById,
  fieldById,
  researchAreaById,
  serviceById,
  type MastersPhdLevel,
} from "@/lib/academic-taxonomy-data";
import { examBySlug } from "@/lib/exams-data";
import { formatNaira } from "@/lib/format";
import { groupClassListings, type GroupClassListing } from "@/lib/group-classes-data";
import { rankTutorsForBrowse, type BrowseSelection, type PreferredExpertLevel } from "@/lib/academic-matching";
import { useReviews } from "@/hooks/use-reviews";
import { computeEffectiveTutorRating } from "@/lib/reviews-store";
import { tutorListings, type TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

type AcademicLevelParam = "undergraduate" | "masters" | "phd";

function toDisplayLevel(param: AcademicLevelParam): "Undergraduate" | "Masters" | "PhD" {
  if (param === "undergraduate") return "Undergraduate";
  if (param === "masters") return "Masters";
  return "PhD";
}

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface RankedTutorLike {
  tutor: TutorListing;
  isBestMatch: boolean;
}

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviews = useReviews();

  const academicLevelParam = searchParams.get("academicLevel") as AcademicLevelParam | null;
  const category = searchParams.get("category");
  const isExamMode = category === "exams";
  const type = (searchParams.get("type") === "group" ? "group" : "private") as "private" | "group";

  function setParams(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    });
    router.replace(`/search?${next.toString()}`);
  }

  // Undergraduate params
  const facultyId = searchParams.get("facultyId") ?? undefined;
  const departmentId = searchParams.get("departmentId") ?? undefined;
  const courseLevel = searchParams.get("courseLevel") ?? undefined;
  const courseId = searchParams.get("courseId") ?? undefined;

  // Masters/PhD params
  const serviceIds = useMemo(() => (searchParams.get("serviceIds")?.split(",").filter(Boolean) ?? []), [searchParams]);
  const fieldId = searchParams.get("fieldId") ?? undefined;
  const customField = searchParams.get("customField") ?? undefined;
  const department = searchParams.get("department") ?? undefined;
  const researchAreaText = searchParams.get("researchAreaText") ?? undefined;
  const preferredExpert = (searchParams.get("preferredExpert") as PreferredExpertLevel | null) ?? undefined;

  // Exam params
  const examSlug = searchParams.get("exam") ?? undefined;
  const exam = examSlug ? examBySlug(examSlug) : undefined;
  const subjectParam = searchParams.get("subject") ?? undefined;

  const isUndergrad = academicLevelParam === "undergraduate";

  const selection: BrowseSelection | null = useMemo(() => {
    if (!academicLevelParam) return null;
    if (isUndergrad) {
      return { academicLevel: "Undergraduate", facultyId, departmentId, level: courseLevel, courseId };
    }
    return {
      academicLevel: toDisplayLevel(academicLevelParam) as MastersPhdLevel,
      serviceIds,
      fieldId,
      customField,
      department,
      researchAreaText,
      preferredExpert,
    };
  }, [academicLevelParam, isUndergrad, facultyId, departmentId, courseLevel, courseId, serviceIds, fieldId, customField, department, researchAreaText, preferredExpert]);

  const academicRanked = useMemo(() => (selection ? rankTutorsForBrowse(tutorListings, selection) : []), [selection]);

  const academicGroupSubjectHint = isUndergrad
    ? (courseId ? courseById(courseId)?.label : departmentId ? departmentById(departmentId)?.label : undefined)
    : (researchAreaText ?? (fieldId ? fieldById(fieldId)?.label : customField));

  const academicGroupClasses = useMemo(() => {
    if (!academicLevelParam) return [];
    const levelBadge = toDisplayLevel(academicLevelParam);
    return groupClassListings.filter((c) => {
      if (c.levelBadge !== levelBadge) return false;
      if (academicGroupSubjectHint) return c.subject.toLowerCase().includes(academicGroupSubjectHint.toLowerCase().split(" ")[0]);
      return true;
    });
  }, [academicLevelParam, academicGroupSubjectHint]);

  // --- Exam mode: matches the current mock tutor/group-class dataset via
  // each exam's relatedLevelTags/relatedSubjects (see exams-data.ts) since
  // individual tutors aren't tagged per-exam yet, only per compound level
  // ("WAEC / NECO", "JAMB / UTME") or plain subject.
  const examTutorPool = useMemo(() => {
    if (!isExamMode || !exam) return [];
    return tutorListings.filter((t) => t.levels.some((l) => exam.relatedLevelTags.includes(l)) || exam.relatedSubjects.includes(t.subject));
  }, [isExamMode, exam]);

  const examAvailableSubjects = useMemo(() => Array.from(new Set(examTutorPool.map((t) => t.subject))), [examTutorPool]);

  const examRanked: RankedTutorLike[] = useMemo(() => {
    if (!isExamMode || !exam) return [];
    const pool = subjectParam ? examTutorPool.filter((t) => t.subject === subjectParam) : examTutorPool;
    const sorted = [...pool].sort((a, b) => {
      if (a.availableToday !== b.availableToday) return a.availableToday ? -1 : 1;
      return computeEffectiveTutorRating(b.name, b.rating, b.reviews).rating - computeEffectiveTutorRating(a.name, a.rating, a.reviews).rating;
    });
    return sorted.map((tutor, i) => ({ tutor, isBestMatch: i === 0 }));
  }, [isExamMode, exam, examTutorPool, subjectParam, reviews]);

  const examGroupClasses = useMemo(() => {
    if (!isExamMode || !exam) return [];
    const pool = groupClassListings.filter((c) => exam.relatedLevelTags.includes(c.levelBadge) || exam.relatedSubjects.includes(c.subject));
    return subjectParam ? pool.filter((c) => c.subject === subjectParam) : pool;
  }, [isExamMode, exam, subjectParam]);

  // Classic subject/level search (Nursery/Primary/Secondary/Language, or a
  // plain text query) has no academicLevel/category param — /find-teachers
  // already implements that matching engine fully, so forward there instead
  // of building a second implementation of the same search.
  const hasClassicSearchParams = !academicLevelParam && !isExamMode && (searchParams.get("q") || searchParams.get("level") || searchParams.get("subject"));
  useEffect(() => {
    if (hasClassicSearchParams) {
      router.replace(`/find-teachers?${searchParams.toString()}`);
    }
  }, [hasClassicSearchParams, router, searchParams]);

  if (!academicLevelParam && !isExamMode) {
    if (hasClassicSearchParams) return null;
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-heading text-xl font-semibold text-ensena-ink">Start by telling us what you&apos;re looking for.</h1>
        <p className="mt-2 text-sm text-ensena-muted">
          Browse by academic level from the homepage, or search for a subject directly.
        </p>
        <Link href="/find-teachers" className="mt-4 inline-block text-sm font-semibold text-ensena-primary hover:underline">
          Browse all tutors
        </Link>
      </div>
    );
  }

  if (isExamMode && !exam) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-heading text-xl font-semibold text-ensena-ink">Choose an exam to see relevant tutors.</h1>
        <Link href="/exams" className="mt-4 inline-block text-sm font-semibold text-ensena-primary hover:underline">
          Back to Exams
        </Link>
      </div>
    );
  }

  const formatWord = type === "group" ? "Group Classes" : "Tutors";

  let heading = "";
  let subheading = "";
  const chips: Chip[] = [];
  let ranked: RankedTutorLike[] = [];
  let matchingGroupClasses: GroupClassListing[] = [];
  let backHref = "/find-teachers";
  let backLabel = "Back to selection";
  let cardAcademicLevel: "Undergraduate" | "Masters" | "PhD" = "Undergraduate";
  let cardSecondAction: "book-instantly" | "view-profile" = "book-instantly";
  let cardShowPreApproval = false;
  let cardBestMatchLabel = "Best Match";

  if (isExamMode && exam) {
    heading = subjectParam ? `${exam.name} ${subjectParam} ${formatWord}` : `${exam.name} ${formatWord}`;
    chips.push({ key: "exam", label: exam.name, onRemove: () => setParams({ exam: undefined, subject: undefined }) });
    if (subjectParam) chips.push({ key: "subject", label: subjectParam, onRemove: () => setParams({ subject: undefined }) });
    ranked = examRanked;
    matchingGroupClasses = examGroupClasses;
    backHref = "/exams";
    backLabel = "Back to Exams";
    cardAcademicLevel = "Undergraduate";
    cardSecondAction = "book-instantly";
    cardShowPreApproval = true;
    cardBestMatchLabel = "Best Match";
  } else if (academicLevelParam) {
    const displayLevel = toDisplayLevel(academicLevelParam);
    heading = `${displayLevel} ${formatWord}`;
    backHref = `/find-teachers/browse?level=${displayLevel}`;
    backLabel = "Back to selection";
    cardAcademicLevel = displayLevel;
    cardSecondAction = isUndergrad ? "book-instantly" : "view-profile";
    cardShowPreApproval = isUndergrad;
    cardBestMatchLabel = isUndergrad ? "Best Match" : "Recommended for your needs";
    ranked = academicRanked;
    matchingGroupClasses = academicGroupClasses;

    if (isUndergrad) {
      const facultyLabel = facultyId ? facultyById(facultyId)?.label : undefined;
      const departmentLabel = departmentId ? departmentById(departmentId)?.label : undefined;
      const courseLabel = courseId ? courseById(courseId)?.label : undefined;

      if (courseLabel) heading = `${courseLabel} ${formatWord}`;
      else if (departmentLabel) heading = `${departmentLabel} ${formatWord}`;
      else if (facultyLabel) heading = `${facultyLabel} ${formatWord}`;
      subheading = [departmentLabel, courseLevel].filter(Boolean).join(" · ");

      if (facultyLabel) chips.push({ key: "faculty", label: facultyLabel, onRemove: () => setParams({ facultyId: undefined, departmentId: undefined, courseLevel: undefined, courseId: undefined }) });
      if (departmentLabel) chips.push({ key: "department", label: departmentLabel, onRemove: () => setParams({ departmentId: undefined, courseLevel: undefined, courseId: undefined }) });
      if (courseLevel) chips.push({ key: "level", label: courseLevel, onRemove: () => setParams({ courseLevel: undefined, courseId: undefined }) });
      if (courseLabel) chips.push({ key: "course", label: courseLabel, onRemove: () => setParams({ courseId: undefined }) });
    } else {
      const fieldLabel = fieldId ? fieldById(fieldId)?.label : customField;
      if (fieldLabel) heading = `Research Experts for ${fieldLabel}`;
      else heading = `${displayLevel} Research Experts`;
      subheading = researchAreaText ?? serviceIds.map((id) => serviceById(id)?.label).filter(Boolean).join(", ");

      serviceIds.forEach((id) => {
        const label = serviceById(id)?.label;
        if (label) chips.push({ key: `service-${id}`, label, onRemove: () => setParams({ serviceIds: serviceIds.filter((s) => s !== id).join(",") || undefined }) });
      });
      if (fieldLabel) chips.push({ key: "field", label: fieldLabel, onRemove: () => setParams({ fieldId: undefined, customField: undefined }) });
      if (department) chips.push({ key: "department", label: department, onRemove: () => setParams({ department: undefined }) });
      if (researchAreaText) chips.push({ key: "researchArea", label: researchAreaText, onRemove: () => setParams({ researchAreaText: undefined }) });
    }
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Link href={backHref} className="flex items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ArrowLeft className="size-4" /> {backLabel}
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-semibold text-ensena-ink sm:text-3xl">{heading}</h1>
      {subheading && <p className="mt-1 text-sm text-ensena-muted">{subheading}</p>}

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="flex items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-3 py-1.5 text-xs font-medium text-ensena-ink hover:border-rose-300 hover:text-rose-600"
            >
              {chip.label} <X className="size-3" />
            </button>
          ))}
        </div>
      )}

      {isExamMode && examAvailableSubjects.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ensena-muted">Narrow by subject:</span>
          {examAvailableSubjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => setParams({ subject: subject === subjectParam ? undefined : subject })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                subject === subjectParam ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              {subject}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
        <button
          type="button"
          onClick={() => setParams({ type: undefined })}
          className={cn("rounded-full px-4 py-2 font-medium transition-colors", type === "private" ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}
        >
          Private ({ranked.length})
        </button>
        <button
          type="button"
          onClick={() => setParams({ type: "group" })}
          className={cn("rounded-full px-4 py-2 font-medium transition-colors", type === "group" ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}
        >
          Group Classes ({matchingGroupClasses.length})
        </button>
      </div>

      {type === "private" ? (
        <div className="mt-5 flex flex-col gap-4">
          {ranked.length === 0 && (
            <p className="rounded-2xl border border-dashed border-ensena-border bg-ensena-bg-soft p-6 text-center text-sm text-ensena-muted">
              No tutors match this selection yet. Remove a filter above, or head back to broaden your search.
            </p>
          )}
          {ranked.map(({ tutor, isBestMatch }) => (
            <AcademicTutorResultCard
              key={tutor.slug}
              tutor={tutor}
              isBestMatch={isBestMatch}
              bestMatchLabel={cardBestMatchLabel}
              academicLevel={cardAcademicLevel}
              secondAction={cardSecondAction}
              showSendPreApproval={cardShowPreApproval}
              researchLabels={tutor.academicSpecialization?.researchAreaIds?.map((id) => researchAreaById(id)?.label ?? "").filter(Boolean)}
              serviceLabels={cardAcademicLevel !== "Undergraduate" ? tutor.academicSpecialization?.serviceIds?.map((id) => serviceById(id)?.label ?? "").filter(Boolean) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matchingGroupClasses.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-ensena-border bg-ensena-bg-soft p-6 text-center text-sm text-ensena-muted">
              No group classes are currently available for this selection. Check back soon, or try Private tutors.
            </p>
          )}
          {matchingGroupClasses.map((c) => (
            <Link key={c.slug} href={`/group-classes/${c.slug}`} className="flex flex-col gap-2 rounded-2xl border border-ensena-border bg-ensena-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <span className="w-fit rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: c.badgeColor, color: c.ringColor }}>
                {c.levelBadge}
              </span>
              <p className="font-heading text-sm font-semibold text-ensena-ink">{c.title}</p>
              <p className="text-xs text-ensena-muted">{c.subject} · {c.days}</p>
              <p className="mt-1 text-sm font-semibold text-ensena-ink">{formatNaira(c.price)} <span className="text-xs font-normal text-ensena-muted">/ session</span></p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
