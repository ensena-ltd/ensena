"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, FileText, RotateCcw, X, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { DocumentViewer, type ViewableDocument } from "@/components/shared/document-viewer";
import { ageFrom, Chips, DetailRows, formatDate, naira, PersonAvatar, SectionCard, TutorStatusBadge } from "@/components/admin/real/admin-ui";
import { getTutorDocumentUrl, reviewTutorApplication, setTutorDocumentStatus } from "@/lib/actions/admin-review";
import type { AdminTutorRecord } from "@/lib/admin-registrations";
import { tutorDocumentTypes, type TutorApplicationStatus } from "@/lib/tutor-application";
import { cn } from "@/lib/utils";

const tabs = ["Tutor Information", "Documents", "Qualification & Teaching Setup", "Account"] as const;
type Tab = (typeof tabs)[number];

const rejectionReasons = [
  "Documents are invalid or unreadable",
  "Qualification doesn't meet Ensena's requirements",
  "Identity could not be verified",
  "Information is inconsistent",
  "Other",
];

// Items an admin can ask a tutor to fix when requesting a resubmission.
const resubmissionItems = [
  ...tutorDocumentTypes.map((d) => d.label),
  "Profile photo",
  "Full name",
  "Subjects",
  "Academic levels",
  "Exam expertise",
  "Teaching experience",
  "Pricing",
  "Bio",
  "Qualification details",
];

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function TutorReview({ tutor, backHref }: { tutor: AdminTutorRecord; backHref: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Tutor Information");
  const [viewing, setViewing] = useState<ViewableDocument | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [modal, setModal] = useState<"approve" | "reject" | "resubmit" | null>(null);
  const [reason, setReason] = useState(rejectionReasons[0]);
  const [note, setNote] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const app = tutor.application;
  const age = ageFrom(tutor.dateOfBirth);

  async function openDocument(doc: AdminTutorRecord["documents"][number], label: string) {
    setOpeningId(doc.id);
    const { url, message } = await getTutorDocumentUrl(doc.storagePath);
    setOpeningId(null);
    if (!url) {
      toast.error(message ?? "We couldn't open that document.");
      return;
    }
    setViewing({ url, fileName: doc.fileName, title: `${tutor.fullName} · ${label}` });
  }

  async function markDocument(doc: AdminTutorRecord["documents"][number], status: "approved" | "rejected") {
    setBusyDocId(doc.id);
    const result = await setTutorDocumentStatus({ documentId: doc.id, tutorId: tutor.id, status });
    setBusyDocId(null);
    if (!result.ok) {
      toast.error(result.message ?? "Couldn't update the document.");
      return;
    }
    toast.success(status === "approved" ? "Document accepted." : "Document marked as not accepted.");
    router.refresh();
  }

  async function submitDecision(status: TutorApplicationStatus) {
    const fullNote = status === "rejected" ? [reason === "Other" ? "" : reason, note.trim()].filter(Boolean).join(". ") : note.trim();
    if ((status === "rejected" || status === "resubmission_required") && !fullNote) {
      toast.error("Please add a reason for the tutor.");
      return;
    }
    if (status === "resubmission_required" && fields.length === 0) {
      toast.error("Tick at least one item the tutor needs to fix.");
      return;
    }
    setSaving(true);
    const result = await reviewTutorApplication({ tutorId: tutor.id, status, note: fullNote, fields });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.message ?? "Couldn't save the decision.");
      return;
    }
    toast.success(
      status === "approved" ? `${tutor.fullName} is now verified.` : status === "rejected" ? "Application rejected." : status === "resubmission_required" ? "Resubmission requested." : "Moved back to Needs Verification."
    );
    setModal(null);
    setNote("");
    setFields([]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />

      <Link href={backHref} className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ArrowLeft className="size-4" /> Back
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <PersonAvatar name={tutor.fullName} url={tutor.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-semibold text-ensena-ink">{tutor.fullName}</h1>
            <TutorStatusBadge status={tutor.status} />
          </div>
          <p className="text-sm text-ensena-muted">{tutor.email}{app.headline && ` · ${app.headline}`}</p>
          <p className="mt-0.5 text-xs text-ensena-muted">
            Registered {formatDate(tutor.createdAt)}
            {tutor.reviewedAt && ` · Last reviewed ${formatDate(tutor.reviewedAt, true)}`}
            {tutor.submittedForReviewAt && ` · Resubmitted ${formatDate(tutor.submittedForReviewAt, true)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tutor.status !== "approved" && (
            <Button onClick={() => setModal("approve")} className="h-10 rounded-full bg-ensena-success px-5 text-sm font-semibold text-white hover:opacity-90">
              <CheckCircle2 className="size-4" /> Approve
            </Button>
          )}
          <Button variant="outline" onClick={() => setModal("resubmit")} className="h-10 rounded-full border-amber-300 px-5 text-sm font-semibold text-amber-700 hover:bg-amber-50">
            <RotateCcw className="size-4" /> Request Resubmission
          </Button>
          {tutor.status !== "rejected" && (
            <Button variant="outline" onClick={() => setModal("reject")} className="h-10 rounded-full border-rose-300 px-5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
              <XCircle className="size-4" /> Reject
            </Button>
          )}
        </div>
      </div>

      {(tutor.status === "rejected" || tutor.status === "resubmission_required") && tutor.rejectionReason && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{tutor.status === "rejected" ? "Rejection reason" : "Resubmission requested"} (shown to the tutor)</p>
          <p className="mt-1">{tutor.rejectionReason}</p>
          {tutor.resubmissionFields.length > 0 && <p className="mt-1 text-xs">Items to fix: {tutor.resubmissionFields.join(", ")}</p>}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-4 border-b border-ensena-border">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("-mb-px border-b-2 pb-2.5 text-sm font-medium", tab === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Tutor Information" && (
        <SectionCard title="Tutor Information">
          <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
            <DetailRows
              rows={[
                ["Full Name", tutor.fullName],
                ["Email Address", tutor.email],
                ["Country", [app.stateCity, app.country].filter(Boolean).join(", ")],
                ["Date Joined", formatDate(tutor.createdAt)],
                ["Account Status", <TutorStatusBadge key="s" status={tutor.status} />],
                ["Headline", app.headline],
              ]}
            />
            <DetailRows
              rows={[
                ["Subjects", <Chips key="subjects" items={app.subjects} />],
                ["Academic Levels", <Chips key="levels" items={app.levels} />],
                ["Exam Expertise", app.exams.join(" / ")],
                ["Teaching Experience", app.yearsExperience],
                ["Languages", app.languages.join(", ")],
                ["Pricing", app.oneOnOnePrice ? `${naira(app.oneOnOnePrice)}/hour` : ""],
                ["Discovery Session", app.discoverySession ? "Available" : "Not available"],
              ]}
            />
          </div>
          <div className="mt-4 border-t border-ensena-border pt-4">
            <p className="text-xs font-semibold text-ensena-muted">Bio</p>
            <p className="mt-1 text-sm leading-relaxed text-ensena-ink">{app.bio || <span className="text-ensena-muted">No bio yet.</span>}</p>
          </div>
          {app.levelExpertise.length > 0 && (
            <div className="mt-4 border-t border-ensena-border pt-4">
              <p className="text-xs font-semibold text-ensena-muted">Subjects by level</p>
              <div className="mt-2 flex flex-col gap-2">
                {app.levelExpertise.map((e) => (
                  <div key={e.level} className="text-sm">
                    <span className="font-medium text-ensena-ink">{e.level}:</span>{" "}
                    <span className="text-ensena-muted">{[...e.items, ...e.exams.map((x) => `${x} (exam)`)].join(", ") || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {tab === "Documents" && (
        <SectionCard title="Verification Documents">
          <div className="flex flex-col gap-3">
            {tutorDocumentTypes.map((dt) => {
              const doc = tutor.documents.find((d) => d.type === dt.type);
              return (
                <div key={dt.type} className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border p-4">
                  <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", doc ? "bg-ensena-success/10 text-ensena-success" : "bg-ensena-bg-soft text-ensena-muted")}>
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ensena-ink">{dt.label} {!dt.required && <span className="text-xs font-normal text-ensena-muted">(optional)</span>}</p>
                    {doc ? (
                      <>
                        <p className={cn("text-sm font-medium", doc.status === "approved" ? "text-ensena-success" : doc.status === "rejected" ? "text-rose-600" : "text-ensena-success")}>
                          {doc.status === "approved" ? "Accepted" : doc.status === "rejected" ? "Not accepted" : "Submitted"}
                        </p>
                        <p className="truncate text-sm text-ensena-muted">{doc.fileName}</p>
                        <p className="text-sm text-ensena-muted">Uploaded {timeAgo(doc.uploadedAt)}</p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-ensena-primary">Not submitted</p>
                    )}
                  </div>
                  {doc && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" loading={openingId === doc.id} onClick={() => openDocument(doc, dt.label)} className="h-9 rounded-full border-ensena-border px-4 text-xs font-semibold">
                        View Document
                      </Button>
                      {doc.status !== "approved" && (
                        <Button variant="outline" disabled={busyDocId === doc.id} onClick={() => markDocument(doc, "approved")} className="h-9 rounded-full border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                          <Check className="size-3.5" /> Accept
                        </Button>
                      )}
                      {doc.status !== "rejected" && (
                        <Button variant="outline" disabled={busyDocId === doc.id} onClick={() => markDocument(doc, "rejected")} className="h-9 rounded-full border-rose-300 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                          <X className="size-3.5" /> Not accepted
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {tab === "Qualification & Teaching Setup" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SectionCard title="Qualification">
            <DetailRows
              rows={[
                ["Highest qualification", app.highestQualification],
                ["Status", app.academicStatus === "Currently In Progress" ? "Currently studying" : app.academicStatus],
                ["Institution", app.institution],
                ["Field of study", app.fieldOfStudy],
                ["Graduation year", app.graduationYear],
              ]}
            />
          </SectionCard>
          <SectionCard title="Teaching Setup">
            <DetailRows
              rows={[
                ["Teaching format", <Chips key="f" items={app.teachingFormats} />],
                ["Teaching mode", <Chips key="m" items={app.teachingModes} />],
                ["Session types", <Chips key="s" items={app.sessionTypes} />],
                ["1-on-1 price", app.oneOnOnePrice ? `${naira(app.oneOnOnePrice)}/hour` : ""],
                ["Group price", app.groupPrice ? `${naira(app.groupPrice)}/student` : ""],
                ["Max group size", app.maxGroupStudents],
                ["Class durations", <Chips key="d" items={app.classDurations} />],
                ["Booking preference", <Chips key="b" items={app.bookingPreferences} />],
                ["Cancellation policy", app.cancellationPolicy],
                ["Teaching styles", <Chips key="ts" items={app.teachingStyles} />],
              ]}
            />
          </SectionCard>
          <SectionCard title="Availability">
            {app.availability.length === 0 ? (
              <p className="text-sm text-ensena-muted">No availability set.</p>
            ) : (
              <DetailRows rows={app.availability.map((a) => [a.day, a.ranges.join(", ")] as [string, string])} />
            )}
          </SectionCard>
          <SectionCard title="Links">
            <DetailRows
              rows={[
                ["LinkedIn", app.linkedin && <a href={app.linkedin} target="_blank" rel="noreferrer" className="text-ensena-primary hover:underline">{app.linkedin}</a>],
                ["Website", app.website && <a href={app.website} target="_blank" rel="noreferrer" className="text-ensena-primary hover:underline">{app.website}</a>],
                ["Nationality", app.nationality],
              ]}
            />
          </SectionCard>
        </div>
      )}

      {tab === "Account" && (
        <SectionCard title="Account">
          <DetailRows
            rows={[
              ["Full name", tutor.fullName],
              ["Email", tutor.email],
              ["Email confirmed", tutor.emailConfirmed ? "Yes" : "Not yet"],
              ["Phone", tutor.phone],
              ["Date of birth", tutor.dateOfBirth ? `${formatDate(tutor.dateOfBirth)}${age !== null ? ` (age ${age})` : ""}` : ""],
              ["Signs in with", tutor.signInMethods.join(", ")],
              ["Registered", formatDate(tutor.createdAt, true)],
              ["Last sign-in", formatDate(tutor.lastSignInAt, true)],
              ["Account ID", <code key="id" className="text-xs">{tutor.id}</code>],
            ]}
          />
        </SectionCard>
      )}

      {/* Approve */}
      <Modal open={modal === "approve"} onClose={() => setModal(null)} title={`Approve ${tutor.fullName}?`}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">They&apos;ll become a verified Ensena tutor and their full Tutor Dashboard unlocks.</p>
          <Button loading={saving} onClick={() => submitDecision("approved")} className="h-10 w-full rounded-full bg-ensena-success text-sm font-semibold text-white">Approve tutor</Button>
        </div>
      </Modal>

      {/* Resubmission */}
      <Modal open={modal === "resubmit"} onClose={() => setModal(null)} title="Request resubmission">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Tell {tutor.fullName.split(" ")[0]} what to fix. They&apos;ll see this on their dashboard and can send the application back for review.</p>
          <div className="grid grid-cols-2 gap-1.5">
            {resubmissionItems.map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm text-ensena-ink">
                <input type="checkbox" checked={fields.includes(item)} onChange={() => setFields((f) => (f.includes(item) ? f.filter((x) => x !== item) : [...f, item]))} className="size-4 accent-ensena-primary" />
                {item}
              </label>
            ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="e.g. Your Government ID photo is blurry — please upload a clearer copy." className="rounded-xl border border-ensena-border p-3 text-sm" />
          <Button loading={saving} onClick={() => submitDecision("resubmission_required")} className="h-10 w-full rounded-full bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600">Request resubmission</Button>
        </div>
      </Modal>

      {/* Reject */}
      <Modal open={modal === "reject"} onClose={() => setModal(null)} title={`Reject ${tutor.fullName}?`}>
        <div className="flex flex-col gap-3">
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 rounded-xl border border-ensena-border px-3 text-sm">
            {rejectionReasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="More detail for the tutor (optional unless you chose Other)" className="rounded-xl border border-ensena-border p-3 text-sm" />
          <Button loading={saving} onClick={() => submitDecision("rejected")} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Reject application</Button>
        </div>
      </Modal>
    </div>
  );
}
