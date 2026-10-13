"use client";

import { ResearchExpertFlow } from "@/components/find-teachers/browse/research-expert-flow";
import { UndergraduateFlow } from "@/components/find-teachers/browse/undergraduate-flow";

// Undergraduate and Masters/PhD are two deliberately different single-page
// matching forms (course/department-driven vs. research-service-driven) —
// see UndergraduateFlow and ResearchExpertFlow respectively.
export function AcademicBrowseFlow({ academicLevel }: { academicLevel: "Undergraduate" | "Masters" | "PhD" }) {
  if (academicLevel === "Undergraduate") return <UndergraduateFlow />;
  return <ResearchExpertFlow academicLevel={academicLevel} />;
}
