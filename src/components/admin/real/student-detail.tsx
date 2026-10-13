import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ageFrom, Chips, DetailRows, formatDate, PersonAvatar, SectionCard } from "@/components/admin/real/admin-ui";
import type { AdminStudentRecord } from "@/lib/admin-registrations";
import { cn } from "@/lib/utils";

// Everything a student entered at registration (and onboarding), plus their
// parent/guardian for "My child" sign-ups.
export function StudentDetail({ student }: { student: AdminStudentRecord }) {
  const age = ageFrom(student.dateOfBirth);
  const g = student.guardian;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/students" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ArrowLeft className="size-4" /> Back to students
      </Link>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <PersonAvatar name={student.fullName} url={student.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-semibold text-ensena-ink">{student.fullName}</h1>
          <p className="text-sm text-ensena-muted">{student.email}</p>
          <p className="mt-0.5 text-xs text-ensena-muted">Registered {formatDate(student.createdAt)} · {student.onboarded ? "Onboarding complete" : "Onboarding not finished"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Account">
          <DetailRows
            rows={[
              ["Full name", student.fullName],
              ["Email", student.email],
              ["Email confirmed", student.emailConfirmed ? "Yes" : "Not yet"],
              ["Phone", student.phone],
              ["Date of birth", student.dateOfBirth ? `${formatDate(student.dateOfBirth)}${age !== null ? ` (age ${age})` : ""}` : ""],
              ["Signs in with", student.signInMethods.join(", ")],
              ["Registered", formatDate(student.createdAt, true)],
              ["Last sign-in", formatDate(student.lastSignInAt, true)],
              ["Account ID", <code key="id" className="text-xs">{student.id}</code>],
            ]}
          />
        </SectionCard>

        <SectionCard title="Learning Profile">
          <DetailRows
            rows={[
              ["Who is learning", student.learningFor],
              ["Academic level", student.academicLevel],
              [student.academicLevel === "Secondary" ? "Class" : student.academicLevel === "Exams" ? "Exam" : "Level / field", student.academicDetail],
              ["Course", student.course],
              ["Subjects", <Chips key="subjects" items={student.subjects} />],
              ["Goal", student.goal],
            ]}
          />
        </SectionCard>

        <SectionCard title="Parent / Guardian">
          {g ? (
            <DetailRows
              rows={[
                ["Name", g.fullName],
                ["Relationship", g.relationship],
                ["Email", g.email],
                ["Phone", g.phone],
                [
                  "Consent",
                  <span key="c" className={cn("font-semibold", g.consentStatus === "confirmed" ? "text-ensena-success" : "text-amber-600")}>
                    {g.consentStatus === "confirmed" ? `Confirmed ${formatDate(g.consentedAt)}` : "Pending"}
                  </span>,
                ],
                ["Consent requested", formatDate(g.consentRequestedAt, true)],
                ["Guardian account", g.guardianAccountId ? "Created" : "Not yet"],
              ]}
            />
          ) : (
            <p className="text-sm text-ensena-muted">{student.learningFor === "My child" ? "No parent/guardian added yet." : "Not applicable — this student is learning for themselves."}</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
