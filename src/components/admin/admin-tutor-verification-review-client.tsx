"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  Ban,
  CheckCircle2,
  ChevronLeft,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  RotateCcw,
  School,
  User,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { adminVerificationStyles, rejectionReasons, resubmissionFieldOptions } from "@/lib/admin-data";
import { useAdminTutors } from "@/hooks/use-admin-tutors";
import { verificationChecklistItems, verificationRowFor, type VerificationTutorRow } from "@/lib/admin-tutor-verification-data";
import { groupClassesFor } from "@/lib/admin-user-profile-data";
import { tutorProfiles } from "@/lib/admin-tutor-profile-data";
import { formatNaira } from "@/lib/format";
import { setTutorVerification } from "@/lib/tutor-verification-store";
import { cn } from "@/lib/utils";

const tabs = ["Profile", "Documents", "Classes", "Activity"] as const;
type Tab = (typeof tabs)[number];

const tabIcons: Record<Tab, typeof User> = { Profile: User, Documents: FileText, Classes: School, Activity: Activity };

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <dt className="text-ensena-muted">{label}</dt>
      <dd className="text-right font-medium text-ensena-ink">{value}</dd>
    </div>
  );
}

function DocumentCard({
  label,
  doc,
  onView,
}: {
  label: string;
  doc: { submitted: boolean; submittedAt?: string; fileName?: string };
  onView: () => void;
}) {
  return (
    <div className="rounded-2xl border border-ensena-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", doc.submitted ? "bg-emerald-100 text-emerald-600" : "bg-ensena-bg-soft text-ensena-muted")}>
            <FileText className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ensena-ink">{label}</p>
            {doc.submitted ? (
              <>
                <span className="text-xs font-medium text-ensena-success">Submitted</span>
                {doc.fileName && <p className="font-mono text-xs text-ensena-muted">{doc.fileName}</p>}
                {doc.submittedAt && <p className="text-xs text-ensena-muted">Uploaded {doc.submittedAt}</p>}
              </>
            ) : (
              <span className="text-xs font-medium text-rose-600">Not submitted</span>
            )}
          </div>
        </div>
        {doc.submitted && (
          <Button variant="outline" onClick={onView} className="h-9 rounded-full border-ensena-border px-4 text-xs font-semibold">View Document</Button>
        )}
      </div>
    </div>
  );
}

export function AdminTutorVerificationReviewClient({ tutorId }: { tutorId: string }) {
  const tutors = useAdminTutors();
  const tutor = tutors.find((t) => t.id === tutorId);
  const [tab, setTab] = useState<Tab>("Profile");
  const [docModal, setDocModal] = useState<{ label: string; fileName?: string; submittedAt?: string } | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState(rejectionReasons[0]);
  const [rejectNote, setRejectNote] = useState("");
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [resubmitFields, setResubmitFields] = useState<string[]>([]);
  const [resubmitNote, setResubmitNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  if (!tutor) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This tutor could not be found.</p>
        <Link href="/admin/verification" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Tutor Verification</Link>
      </div>
    );
  }

  function approve() {
    setTutorVerification(tutorId, "Verified", { verificationNote: undefined, resubmissionFields: undefined });
    flash("Tutor successfully verified.");
    setApproveOpen(false);
  }
  function reject() {
    setTutorVerification(tutorId, "Rejected", { verificationNote: rejectNote || rejectReason });
    flash("Tutor application rejected.");
    setRejectOpen(false);
    setRejectNote("");
  }
  function sendResubmissionRequest() {
    setTutorVerification(tutorId, "Resubmission Required", { verificationNote: resubmitNote, resubmissionFields: resubmitFields });
    flash("Resubmission request sent to tutor.");
    setResubmitOpen(false);
    setResubmitFields([]);
    setResubmitNote("");
  }
  function toggleResubmitField(field: string) {
    setResubmitFields((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]));
  }

  const row: VerificationTutorRow = verificationRowFor(tutor);
  const profile = tutorProfiles[tutor.id];
  const classes = groupClassesFor(tutor.name);
  const checklist = verificationChecklistItems(row);
  const isDecided = tutor.verification === "Verified" || tutor.verification === "Rejected";

  const docs: { key: keyof typeof row.documents; label: string }[] = [
    { key: "idDocument", label: "Government ID" },
    { key: "qualifications", label: "Academic Certificate" },
    { key: "certificates", label: "Teaching Qualification" },
    { key: "teachingVideo", label: "Other Document" },
  ];

  return (
    <div>
      <Link href="/admin/verification" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to Tutor Verification
      </Link>

      {/* Header */}
      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full">
              <Image src={row.image} alt={tutor.name} fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-xl font-semibold text-ensena-ink">{tutor.name}</h1>
              <p className="mt-0.5 text-sm font-semibold text-ensena-primary">{tutor.subjects[0]} Tutor</p>
              <span className={cn("mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", adminVerificationStyles[tutor.verification])}>
                {tutor.verification === "Verified" ? "Verified Tutor" : tutor.verification}
              </span>
              <p className="mt-2 text-sm text-ensena-muted">{tutor.subjects.join(", ")} · {row.examExpertise}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ensena-muted">
                <span>Submitted: {row.submittedLabel}</span>
                <span>Tutor ID: {row.tutorId}</span>
              </div>
            </div>
          </div>

          {!isDecided && (
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
              <div className="flex gap-2">
                <Button onClick={() => setApproveOpen(true)} className="h-10 flex-1 rounded-full bg-ensena-success px-5 text-sm font-semibold text-white hover:bg-ensena-success/90"><CheckCircle2 className="size-4" /> Approve Tutor</Button>
                <Button variant="outline" onClick={() => setRejectOpen(true)} className="h-10 flex-1 rounded-full border-ensena-border px-5 text-sm font-medium text-rose-600"><XCircle className="size-4" /> Reject Tutor</Button>
              </div>
              <Button variant="outline" onClick={() => setResubmitOpen(true)} className="h-10 w-full rounded-full border-amber-300 px-5 text-sm font-medium text-amber-700 hover:bg-amber-50"><RotateCcw className="size-4" /> Request Resubmission</Button>
            </div>
          )}
          {isDecided && (
            <div className={cn("flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold", tutor.verification === "Verified" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
              {tutor.verification === "Verified" ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />}
              {tutor.verification === "Verified" ? "Verified Tutor" : "Application Rejected"}
            </div>
          )}
        </div>
        {tutor.verificationNote && tutor.verification !== "Verified" && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
            <span className="font-semibold">Admin note:</span> {tutor.verificationNote}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Left: profile + documents */}
        <div className="min-w-0 flex-1">
          <div className="flex gap-6 overflow-x-auto border-b border-ensena-border text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => {
              const Icon = tabIcons[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 pt-1 transition-colors",
                    tab === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink"
                  )}
                >
                  <Icon className="size-4" /> {t}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {tab === "Profile" && (
              <>
                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                  <h2 className="font-heading text-sm font-semibold text-ensena-ink">Tutor Information</h2>
                  <div className="mt-2 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                    <dl className="divide-y divide-ensena-border">
                      <InfoRow label="Full Name" value={tutor.name} />
                      <InfoRow label="Email Address" value={tutor.email} />
                      <InfoRow label="Country" value="Nigeria" />
                      <InfoRow label="Date Joined" value={tutor.joined} />
                      <InfoRow label="Account Status" value={tutor.status} />
                    </dl>
                    <dl className="divide-y divide-ensena-border">
                      <InfoRow label="Subjects" value={tutor.subjects.join(", ")} />
                      <InfoRow label="Academic Levels" value={row.academicLevels} />
                      <InfoRow label="Exam Expertise" value={row.examExpertise} />
                      <InfoRow label="Teaching Experience" value={`${row.experienceYears} years`} />
                      <InfoRow label="Languages" value={row.languages.join(", ")} />
                      <InfoRow label="Pricing" value={`${formatNaira(row.pricePerHour)}/hour`} />
                      <InfoRow label="Discovery Session" value={row.discoverySessionAvailable ? "Available" : "Not Available"} />
                    </dl>
                  </div>
                  <p className="mt-3 text-sm text-ensena-muted">{row.bio}</p>
                </div>

                <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                  <h2 className="font-heading text-sm font-semibold text-ensena-ink">Verification Documents</h2>
                  <div className="mt-3 flex flex-col gap-3">
                    {docs.map((d) => (
                      <DocumentCard key={d.key} label={d.label} doc={row.documents[d.key]} onView={() => setDocModal({ label: d.label, ...row.documents[d.key] })} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === "Documents" && (
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <h2 className="font-heading text-sm font-semibold text-ensena-ink">Verification Documents</h2>
                <div className="mt-3 flex flex-col gap-3">
                  {docs.map((d) => (
                    <DocumentCard key={d.key} label={d.label} doc={row.documents[d.key]} onView={() => setDocModal({ label: d.label, ...row.documents[d.key] })} />
                  ))}
                </div>
              </div>
            )}

            {tab === "Classes" && (
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <h2 className="font-heading text-sm font-semibold text-ensena-ink">Classes</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {classes.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/group-classes/${c.slug}`} target="_blank" className="flex items-center justify-between rounded-xl border border-ensena-border p-3 text-sm hover:bg-ensena-bg-soft">
                        <span className="flex items-center gap-2 text-ensena-ink"><GraduationCap className="size-4 text-ensena-muted" /> {c.title}</span>
                        <span className="text-xs text-ensena-muted">{c.gradeLevel} · {c.students}/{c.maxSeats} students</span>
                      </Link>
                    </li>
                  ))}
                  {classes.length === 0 && <p className="text-sm text-ensena-muted">No classes on record for this tutor yet.</p>}
                </ul>
              </div>
            )}

            {tab === "Activity" && (
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <h2 className="font-heading text-sm font-semibold text-ensena-ink">Activity</h2>
                <ul className="mt-3 flex flex-col gap-3">
                  {(profile?.activityLog ?? []).map((a, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ensena-primary" />
                      <div>
                        <p className="text-sm text-ensena-ink">{a.action}</p>
                        <p className="text-xs text-ensena-muted">{a.time}</p>
                      </div>
                    </li>
                  ))}
                  {(!profile || profile.activityLog.length === 0) && <p className="text-sm text-ensena-muted">No activity recorded yet.</p>}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right: checklist + decision — normal document flow, not sticky */}
        <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Verification Checklist</h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2.5 text-sm">
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded border", item.done ? "border-ensena-success bg-ensena-success text-white" : "border-ensena-border")}>
                    {item.done && <CheckCircle2 className="size-3.5" />}
                  </span>
                  <span className={item.done ? "text-ensena-ink" : "text-ensena-muted"}>{item.label}</span>
                </li>
              ))}
              <li className="flex items-center gap-2.5 text-sm">
                <span className={cn("flex size-5 shrink-0 items-center justify-center rounded border", tutor.verification === "Verified" ? "border-ensena-success bg-ensena-success text-white" : "border-ensena-border")}>
                  {tutor.verification === "Verified" && <CheckCircle2 className="size-3.5" />}
                </span>
                <span className={tutor.verification === "Verified" ? "text-ensena-ink" : "text-ensena-muted"}>Documents verified</span>
              </li>
            </ul>
          </div>

          {!isDecided && (
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="font-heading text-sm font-semibold text-ensena-ink">Admin Decision</h2>
              <div className="mt-3 flex flex-col gap-3">
                <div className="rounded-xl bg-emerald-50 p-3.5">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" /> Approve Tutor</p>
                  <p className="mt-1 text-xs text-emerald-700/80">Approving this tutor will make them a verified Enseña tutor and allow them to teach on the platform.</p>
                  <Button onClick={() => setApproveOpen(true)} className="mt-2.5 h-9 w-full rounded-full bg-ensena-success text-xs font-semibold text-white hover:bg-ensena-success/90">Approve Tutor</Button>
                </div>
                <div className="rounded-xl bg-amber-50 p-3.5">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700"><RotateCcw className="size-4" /> Request Resubmission</p>
                  <p className="mt-1 text-xs text-amber-700/80">Ask the tutor to provide additional or clearer information before they can be verified.</p>
                  <Button variant="outline" onClick={() => setResubmitOpen(true)} className="mt-2.5 h-9 w-full rounded-full border-amber-300 text-xs font-semibold text-amber-700 hover:bg-amber-100">Request Resubmission</Button>
                </div>
                <div className="rounded-xl bg-rose-50 p-3.5">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-700"><XCircle className="size-4" /> Reject Tutor</p>
                  <p className="mt-1 text-xs text-rose-700/80">Reject this tutor application. The tutor will not be able to teach on Enseña.</p>
                  <Button variant="outline" onClick={() => setRejectOpen(true)} className="mt-2.5 h-9 w-full rounded-full border-rose-300 text-xs font-semibold text-rose-700 hover:bg-rose-100">Reject Tutor</Button>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-ensena-muted"><FileText className="size-3 shrink-0" /> All actions are logged for security and moderation purposes.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document viewer */}
      <Modal open={!!docModal} onClose={() => setDocModal(null)} title={docModal?.label ?? "Document"}>
        {docModal && (
          <div className="flex flex-col gap-3">
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl bg-ensena-bg-soft p-6 text-center">
              <FileText className="size-10 text-ensena-muted" />
              <p className="text-sm text-ensena-muted">Document preview isn&apos;t available in this demo environment. In production this shows the actual file the tutor uploaded.</p>
              {docModal.fileName && <p className="font-mono text-xs text-ensena-muted">{docModal.fileName}</p>}
            </div>
            <div className="flex items-center justify-between text-xs text-ensena-muted">
              <span>{docModal.submittedAt ? `Uploaded ${docModal.submittedAt}` : ""}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => flash("Opening in new tab isn't available in this demo.")} className="flex items-center gap-1 rounded-full border border-ensena-border px-3 py-1.5 font-medium text-ensena-ink hover:bg-ensena-bg-soft"><ExternalLink className="size-3.5" /> Open in new tab</button>
                <button type="button" onClick={() => flash("Download isn't available in this demo.")} className="flex items-center gap-1 rounded-full border border-ensena-border px-3 py-1.5 font-medium text-ensena-ink hover:bg-ensena-bg-soft"><Download className="size-3.5" /> Download</button>
              </div>
            </div>
            <Button variant="outline" onClick={() => setDocModal(null)} className="h-10 w-full rounded-full border-ensena-border text-sm font-medium">Close</Button>
          </div>
        )}
      </Modal>

      {/* Approve confirmation */}
      <Modal open={approveOpen} onClose={() => setApproveOpen(false)} title={`Approve ${tutor.name}?`}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This tutor will become a verified Enseña tutor and can offer approved classes on the platform.</p>
          <div className="mt-1 flex gap-2">
            <Button variant="outline" onClick={() => setApproveOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={approve} className="h-10 flex-1 rounded-full bg-ensena-success text-sm font-semibold text-white hover:bg-ensena-success/90">Approve Tutor</Button>
          </div>
        </div>
      </Modal>

      {/* Reject confirmation */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Tutor?">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason</span>
            <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
              {rejectionReasons.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Admin note</span>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder="Explain why the application was rejected…" className="rounded-xl border border-ensena-border p-2.5 text-sm" />
          </label>
          <div className="mt-1 flex gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={reject} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Reject Tutor</Button>
          </div>
        </div>
      </Modal>

      {/* Request Resubmission */}
      <Modal open={resubmitOpen} onClose={() => setResubmitOpen(false)} title="Request More Information">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-ensena-muted">Select what needs fixing</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {resubmissionFieldOptions.map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm text-ensena-ink">
                  <input type="checkbox" checked={resubmitFields.includes(f)} onChange={() => toggleResubmitField(f)} className="size-4 rounded border-ensena-border accent-ensena-primary" />
                  {f}
                </label>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason</span>
            <textarea value={resubmitNote} onChange={(e) => setResubmitNote(e.target.value)} rows={3} placeholder="e.g. Please upload a clearer copy of your teaching qualification." className="rounded-xl border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button onClick={sendResubmissionRequest} className="mt-1 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">Send Request</Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
