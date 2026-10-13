"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, CheckCircle2, Clock, FileText, ShieldAlert, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { initialAdminCounsellors, type AdminCounsellor } from "@/lib/admin-data";
import { tutorListings, type AcademicVerificationStatus, type TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

// Tutor verification now has its own dedicated workspace at
// /admin/verification (see admin-tutor-verification-client.tsx) — this page
// keeps the Counsellor and Academic-Qualification review queues, which
// don't have a home there yet.
const tabs = ["Counsellors", "Academic Qualifications"] as const;
type Tab = (typeof tabs)[number];

interface AuditEntry {
  time: string;
  action: string;
}

interface AcademicReviewState {
  tutor: TutorListing;
  mastersVerification: AcademicVerificationStatus;
  phdVerification: AcademicVerificationStatus;
  auditLog: AuditEntry[];
}

const academicSpecialistTutors = tutorListings.filter((t) => t.qualification);

function verificationTone(status: AcademicVerificationStatus): string {
  if (status === "Verified") return "bg-emerald-100 text-emerald-700";
  if (status === "Pending") return "bg-amber-100 text-amber-700";
  if (status === "Rejected" || status === "Suspended") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AdminVerificationClient() {
  const [tab, setTab] = useState<Tab>("Counsellors");
  const [counsellors, setCounsellors] = useState<AdminCounsellor[]>(initialAdminCounsellors);
  const [academicReviews, setAcademicReviews] = useState<AcademicReviewState[]>(
    academicSpecialistTutors.map((tutor) => ({
      tutor,
      mastersVerification: tutor.mastersVerification ?? "Unverified",
      phdVerification: tutor.phdVerification ?? "Unverified",
      auditLog: [],
    }))
  );
  const [infoRequestSlug, setInfoRequestSlug] = useState<string | null>(null);
  const [infoRequestNote, setInfoRequestNote] = useState("");

  const pendingCounsellors = counsellors.filter((c) => c.status === "Pending");
  const pendingAcademicReviews = academicReviews.filter(
    (r) => r.mastersVerification === "Pending" || r.phdVerification === "Pending" || r.mastersVerification === "Unverified" || r.phdVerification === "Unverified"
  );

  function updateAcademicReview(slug: string, patch: Partial<Pick<AcademicReviewState, "mastersVerification" | "phdVerification">>, logEntry: string) {
    setAcademicReviews((prev) =>
      prev.map((r) =>
        r.tutor.slug === slug
          ? { ...r, ...patch, auditLog: [{ time: "Just now", action: logEntry }, ...r.auditLog] }
          : r
      )
    );
  }
  function submitInfoRequest() {
    if (!infoRequestSlug || !infoRequestNote.trim()) return;
    updateAcademicReview(infoRequestSlug, {}, `Requested additional documentation: "${infoRequestNote.trim()}"`);
    setInfoRequestSlug(null);
    setInfoRequestNote("");
  }

  function approveCounsellor(id: string) {
    setCounsellors((prev) => prev.map((c) => (c.id === id ? { ...c, status: "Active" } : c)));
  }
  function rejectCounsellor(id: string) {
    setCounsellors((prev) => prev.map((c) => (c.id === id ? { ...c, status: "Suspended" } : c)));
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Other Verifications</h1>
        <p className="mt-1 text-sm text-ensena-muted">Review pending counsellor and academic-qualification verification submissions.</p>
        <Link href="/admin/verification" className="mt-1 inline-flex text-xs font-semibold text-ensena-primary hover:underline">Looking for Tutor Verification? →</Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 rounded-full border border-ensena-border bg-ensena-surface p-1 text-sm w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-medium",
              tab === t ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:text-ensena-ink"
            )}
          >
            {t}{" "}
            {t === "Counsellors" ? `(${pendingCounsellors.length})` : `(${pendingAcademicReviews.length})`}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        {tab === "Counsellors" && (
          <ul className="flex flex-col gap-3">
            {pendingCounsellors.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ensena-border p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary">
                    {initials(c.name)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ensena-ink">{c.name}</p>
                    <p className="text-xs text-ensena-muted">{c.email} · Applied {c.joined}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => approveCounsellor(c.id)} className="h-8 rounded-full bg-ensena-success px-3 text-xs font-semibold text-white hover:bg-ensena-success/90">
                    <CheckCircle2 className="size-3.5" /> Approve
                  </Button>
                  <Button variant="outline" onClick={() => rejectCounsellor(c.id)} className="h-8 rounded-full border-ensena-border px-3 text-xs font-medium text-rose-600">
                    <XCircle className="size-3.5" /> Reject
                  </Button>
                </div>
              </li>
            ))}
            {pendingCounsellors.length === 0 && <p className="py-8 text-center text-sm text-ensena-muted">No counsellors pending verification.</p>}
          </ul>
        )}

        {tab === "Academic Qualifications" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-ensena-muted">
              Masters/PhD tutoring is hidden from students until verified here. A qualification entered at signup is never enough on its own.
            </p>
            {academicReviews.map((r) => {
              const q = r.tutor.qualification!;
              return (
                <div key={r.tutor.slug} className="rounded-xl border border-ensena-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ensena-ink">{r.tutor.name}</p>
                      <p className="text-xs text-ensena-muted">
                        {q.highestQualification} · {q.status} · {q.programme}, {q.institution}
                        {q.status === "Completed" ? ` (${q.graduationYear})` : ` (expected ${q.expectedGraduationYear})`}
                      </p>
                      {q.researchArea && <p className="text-xs text-ensena-muted">Research area: {q.researchArea}</p>}
                      <p className="mt-1 flex items-center gap-1 text-xs text-ensena-primary"><FileText className="size-3.5" /> Verification documents on file</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", verificationTone(r.mastersVerification))}>Master&apos;s: {r.mastersVerification}</span>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", verificationTone(r.phdVerification))}>PhD: {r.phdVerification}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => updateAcademicReview(r.tutor.slug, { mastersVerification: "Verified" }, "Master's qualification verified")} className="h-8 rounded-full bg-ensena-success px-3 text-xs font-semibold text-white hover:bg-ensena-success/90">
                      <CheckCircle2 className="size-3.5" /> Approve Master&apos;s
                    </Button>
                    {q.highestQualification === "PhD" && (
                      <Button onClick={() => updateAcademicReview(r.tutor.slug, { phdVerification: "Verified" }, "PhD qualification verified")} className="h-8 rounded-full bg-ensena-success px-3 text-xs font-semibold text-white hover:bg-ensena-success/90">
                          <BadgeCheck className="size-3.5" /> Approve PhD
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setInfoRequestSlug(r.tutor.slug)} className="h-8 rounded-full border-ensena-border px-3 text-xs font-medium text-ensena-ink">
                      <Clock className="size-3.5" /> Request More Info
                    </Button>
                    <Button variant="outline" onClick={() => updateAcademicReview(r.tutor.slug, { mastersVerification: "Rejected", phdVerification: "Rejected" }, "Qualification rejected")} className="h-8 rounded-full border-ensena-border px-3 text-xs font-medium text-rose-600">
                      <XCircle className="size-3.5" /> Reject
                    </Button>
                    <Button variant="outline" onClick={() => updateAcademicReview(r.tutor.slug, { mastersVerification: "Suspended", phdVerification: "Suspended" }, "Masters/PhD tutoring privileges suspended")} className="h-8 rounded-full border-ensena-border px-3 text-xs font-medium text-rose-600">
                      <ShieldAlert className="size-3.5" /> Suspend
                    </Button>
                  </div>

                  {r.auditLog.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1 border-t border-ensena-border pt-2 text-xs text-ensena-muted">
                      {r.auditLog.map((entry, i) => (
                        <li key={i}>{entry.time} · {entry.action}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {academicReviews.length === 0 && <p className="py-8 text-center text-sm text-ensena-muted">No academic qualification submissions yet.</p>}
          </div>
        )}
      </div>

      <Modal open={!!infoRequestSlug} onClose={() => setInfoRequestSlug(null)} title="Request Additional Documentation">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">What should the tutor provide?</span>
            <textarea
              value={infoRequestNote}
              onChange={(e) => setInfoRequestNote(e.target.value)}
              rows={3}
              placeholder="e.g. Please upload your official transcript in addition to your degree certificate."
              className="rounded-lg border border-ensena-border p-2.5 text-sm"
            />
          </label>
          <Button onClick={submitInfoRequest} className="h-10 w-full rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to text-sm font-semibold text-white">
            Send Request
          </Button>
        </div>
      </Modal>
    </div>
  );
}
