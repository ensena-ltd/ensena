"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GraduationCap, HeartHandshake, Search, Users } from "lucide-react";

import { formatDate, PersonAvatar } from "@/components/admin/real/admin-ui";
import type { AdminStudentRecord } from "@/lib/admin-registrations";
import { cn } from "@/lib/utils";

type Filter = "all" | "myself" | "child" | "consent-pending";

// Real students from Supabase with what they entered at sign-up.
export function StudentList({ students }: { students: AdminStudentRecord[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "myself" && s.learningFor !== "My child") ||
        (filter === "child" && s.learningFor === "My child") ||
        (filter === "consent-pending" && s.guardian?.consentStatus === "pending");
      const matchesQuery = !q || [s.fullName, s.email, s.phone, s.academicLevel, s.academicDetail, s.course, ...s.subjects].some((v) => v.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [students, filter, query]);

  const filters: { key: Filter; label: string; count: number; icon: typeof Users }[] = [
    { key: "all", label: "All Students", count: students.length, icon: Users },
    { key: "myself", label: "Learning for themselves", count: students.filter((s) => s.learningFor !== "My child").length, icon: GraduationCap },
    { key: "child", label: "Signed up by/for a child", count: students.filter((s) => s.learningFor === "My child").length, icon: HeartHandshake },
    { key: "consent-pending", label: "Guardian consent pending", count: students.filter((s) => s.guardian?.consentStatus === "pending").length, icon: HeartHandshake },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Students</h1>
      <p className="mt-1 text-sm text-ensena-muted">Everyone who registered as a student, with their sign-up details.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {filters.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={cn("flex items-center gap-3 rounded-2xl border bg-ensena-surface p-4 text-left", filter === f.key ? "border-ensena-primary" : "border-ensena-border hover:bg-ensena-bg-soft")}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ensena-primary/10 text-ensena-primary"><f.icon className="size-5" /></span>
            <span>
              <span className="block font-heading text-xl font-semibold text-ensena-ink">{f.count}</span>
              <span className="block text-xs font-medium text-ensena-ink">{f.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface">
        <div className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone, level, course or subject" className="h-10 w-full rounded-xl border border-ensena-border pl-9 pr-3 text-sm outline-none focus-visible:border-ensena-primary" />
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 pb-8 pt-2 text-center text-sm text-ensena-muted">No students match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-y border-ensena-border bg-ensena-bg-soft text-xs text-ensena-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Student</th>
                  <th className="px-4 py-2.5 font-medium">Level</th>
                  <th className="px-4 py-2.5 font-medium">Learning for</th>
                  <th className="px-4 py-2.5 font-medium">Subjects</th>
                  <th className="px-4 py-2.5 font-medium">Guardian</th>
                  <th className="px-4 py-2.5 font-medium">Signed up with</th>
                  <th className="px-4 py-2.5 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-ensena-border last:border-b-0 hover:bg-ensena-bg-soft/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/students/${s.id}`} className="flex items-center gap-3">
                        <PersonAvatar name={s.fullName} url={s.avatarUrl} size={36} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ensena-ink hover:text-ensena-primary">{s.fullName}</span>
                          <span className="block truncate text-xs text-ensena-muted">{s.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-ensena-ink">{[s.academicDetail || s.academicLevel, s.course].filter(Boolean).join(" · ") || <span className="text-ensena-muted">Not finished sign-up</span>}</td>
                    <td className="px-4 py-3 text-xs text-ensena-ink">{s.learningFor || "—"}</td>
                    <td className="max-w-[200px] px-4 py-3 text-xs text-ensena-ink">{s.subjects.slice(0, 3).join(", ") || "—"}{s.subjects.length > 3 && ` +${s.subjects.length - 3}`}</td>
                    <td className="px-4 py-3 text-xs">
                      {s.guardian ? (
                        <span className={cn("font-medium", s.guardian.consentStatus === "confirmed" ? "text-ensena-success" : "text-amber-600")}>
                          {s.guardian.fullName} · {s.guardian.consentStatus === "confirmed" ? "Consented" : "Pending"}
                        </span>
                      ) : (
                        <span className="text-ensena-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ensena-ink">{s.signInMethods.join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-xs text-ensena-muted">{formatDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
