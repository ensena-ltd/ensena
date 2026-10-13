"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BadgeCheck, CheckCircle2, Clock, FileText, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DocumentViewer, type ViewableDocument } from "@/components/shared/document-viewer";
import { LevelSubjectPicker } from "@/components/sign-up/level-subject-picker";
import {
  formatJoined,
  isTutorVerified,
  saveTutorInformation,
  tutorDocumentTypes,
  useTutorIdentity,
  verificationChecklist,
  type TutorDocType,
} from "@/components/tutor-dashboard/tutor-identity";
import { academicLevels } from "@/lib/data";
import { countryInfo, countryNames } from "@/lib/geo-data";
import { LEVEL_EXPERTISE_CONFIG, examOptions } from "@/lib/level-expertise-config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { experienceOptions, type LevelExpertise } from "@/lib/tutor-signup-data";
import { languageOptions } from "@/lib/tutors";
import { cn } from "@/lib/utils";

const DOC_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
const DOC_TYPES = Object.keys(DOC_EXT);
const MAX_DOC_BYTES = 10 * 1024 * 1024;

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-ensena-border py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-44 shrink-0 pt-2 text-sm text-ensena-muted">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const inputClass = "h-10 w-full rounded-xl border border-ensena-border px-3 text-sm outline-none focus-visible:border-ensena-primary";
const chipClass = (on: boolean) =>
  cn("rounded-full border px-3 py-1.5 text-sm font-medium", on ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft");

export function VerificationClient() {
  const router = useRouter();
  const me = useTutorIdentity();
  const verified = isTutorVerified(me);
  const checklist = verificationChecklist(me);
  const needsChanges = me.applicationStatus === "resubmission_required" || me.applicationStatus === "rejected";
  const [resubmitting, setResubmitting] = useState(false);

  async function submitForReview() {
    if (!checklist.complete) {
      toast.error("Please complete every item in the checklist first.");
      return;
    }
    setResubmitting(true);
    const { error } = await getSupabaseBrowserClient().rpc("tutor_submit_for_review");
    setResubmitting(false);
    if (error) {
      toast.error(error.message || "We couldn't submit your application. Please try again.");
      return;
    }
    toast.success("Submitted for review. We'll email you once it's checked.");
    router.refresh();
  }

  // ----- Tutor Information form (pre-filled from sign-up) -----
  const initialExpertise = (Array.isArray(me.applicationData.levelExpertise) ? me.applicationData.levelExpertise : []) as LevelExpertise[];
  const [fullName, setFullName] = useState(me.name === me.email ? "" : me.name);
  const [country, setCountry] = useState(me.country);
  const [stateCity, setStateCity] = useState(me.stateCity);
  const [levels, setLevels] = useState<string[]>(me.levels);
  const [expertise, setExpertise] = useState<LevelExpertise[]>(initialExpertise);
  const [activeLevel, setActiveLevel] = useState<string | null>(me.levels[0] ?? null);
  const [yearsExperience, setYearsExperience] = useState(me.yearsExperience);
  const [languages, setLanguages] = useState<string[]>(me.languages);
  const [price, setPrice] = useState(me.oneOnOnePrice);
  const [discovery, setDiscovery] = useState(me.discoverySession);
  const [bio, setBio] = useState(me.bio);
  const [saving, setSaving] = useState(false);
  const countryData = countryInfo(country);

  function entryFor(level: string) {
    return expertise.find((e) => e.level === level);
  }
  function patchLevel(level: string, patch: Partial<LevelExpertise>) {
    setExpertise((prev) =>
      prev.some((e) => e.level === level)
        ? prev.map((e) => (e.level === level ? { ...e, ...patch } : e))
        : [...prev, { level, category: LEVEL_EXPERTISE_CONFIG[level]?.category ?? "subject", items: [], ...patch }]
    );
  }
  function toggleLevel(level: string) {
    const next = toggle(levels, level);
    setLevels(next);
    if (next.includes(level)) setActiveLevel(level);
    else if (activeLevel === level) setActiveLevel(next[0] ?? null);
  }

  async function saveInfo() {
    const missing: string[] = [];
    if (!fullName.trim()) missing.push("full name");
    if (!country) missing.push("country");
    if (levels.length === 0) missing.push("academic levels");
    if (!levels.every((l) => (entryFor(l)?.items.length ?? 0) > 0)) missing.push("subjects for every level");
    if (levels.includes("Exams") && (entryFor("Exams")?.exams?.length ?? 0) === 0) missing.push("exam expertise");
    if (!yearsExperience) missing.push("teaching experience");
    if (languages.length === 0) missing.push("languages");
    if (!price.trim()) missing.push("pricing");
    if (bio.trim().length < 50) missing.push("a bio of at least 50 characters");
    if (missing.length > 0) {
      toast.error(`Please add ${missing.join(", ")}.`);
      return;
    }
    setSaving(true);
    const { error } = await saveTutorInformation(me, {
      fullName,
      application: {
        country,
        stateCity,
        levels,
        levelExpertise: expertise.filter((e) => levels.includes(e.level)),
        yearsExperience,
        languagesSpoken: languages,
        oneOnOnePrice: price.trim(),
        trialLessonEnabled: discovery,
        bio: bio.trim(),
      },
    });
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Tutor information saved.");
    router.refresh();
  }

  // ----- Verification Documents -----
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadingType, setUploadingType] = useState<TutorDocType | null>(null);
  const [pendingType, setPendingType] = useState<TutorDocType | null>(null);

  function pickFile(type: TutorDocType) {
    setPendingType(type);
    fileInput.current?.click();
  }

  async function uploadDocument(file: File) {
    const type = pendingType;
    if (!type || !me.id) return;
    if (!DOC_TYPES.includes(file.type)) {
      toast.error("Please upload a PDF, Word document or image (JPG, PNG, WEBP or GIF).");
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      toast.error(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The maximum is 10MB.`);
      return;
    }
    setUploadingType(type);
    const supabase = getSupabaseBrowserClient();
    const path = `${me.id}/${type}-${Date.now()}.${DOC_EXT[file.type]}`;
    const { error: uploadError } = await supabase.storage.from("tutor-documents").upload(path, file, { contentType: file.type });
    if (uploadError) {
      setUploadingType(null);
      toast.error("We couldn't upload that file. Please try again.");
      return;
    }
    const previous = me.documents.find((d) => d.type === type);
    const { error: rowError } = await supabase
      .from("tutor_verification_documents")
      .upsert(
        { tutor_id: me.id, doc_type: type, file_name: file.name, storage_path: path, status: "submitted", uploaded_at: new Date().toISOString(), reviewed_at: null },
        { onConflict: "tutor_id,doc_type" }
      );
    if (rowError) {
      await supabase.storage.from("tutor-documents").remove([path]);
      setUploadingType(null);
      toast.error("We couldn't save that document. Please try again.");
      return;
    }
    if (previous && previous.storagePath !== path) await supabase.storage.from("tutor-documents").remove([previous.storagePath]);
    setUploadingType(null);
    toast.success(`${tutorDocumentTypes.find((d) => d.type === type)?.label} uploaded.`);
    router.refresh();
  }

  const [viewing, setViewing] = useState<ViewableDocument | null>(null);
  const [openingPath, setOpeningPath] = useState<string | null>(null);

  // Private bucket: a short-lived signed link, shown in the in-app viewer.
  async function viewDocument(path: string, fileName: string, title: string) {
    setOpeningPath(path);
    const { data, error } = await getSupabaseBrowserClient().storage.from("tutor-documents").createSignedUrl(path, 60 * 10);
    setOpeningPath(null);
    if (error || !data) {
      toast.error("We couldn't open that document.");
      return;
    }
    setViewing({ url: data.signedUrl, fileName, title });
  }

  const exams = entryFor("Exams")?.exams ?? [];

  return (
    <div className="flex flex-col gap-6">
      <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Verification</h1>
        <p className="mt-1 text-sm text-ensena-muted">Ensena reviews every tutor before their profile goes live to students.</p>
      </div>

      {verified ? (
        <div className="flex items-start gap-3 rounded-2xl border border-ensena-success/30 bg-ensena-success/10 p-4 text-sm text-ensena-ink">
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-ensena-success" />
          <div>
            <p className="font-semibold">You&apos;re a verified tutor</p>
            <p className="text-ensena-muted">Your profile is live. Keep your information and documents up to date.</p>
          </div>
        </div>
      ) : needsChanges ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">{me.applicationStatus === "resubmission_required" ? "Resubmission required" : "Your application wasn't approved"}</p>
              <p>{me.rejectionReason || "Please update your information or documents below and our team will review them again."}</p>
              {me.resubmissionFields.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {me.resubmissionFields.map((f) => <li key={f}>{f}</li>)}
                </ul>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pl-8">
            <Button onClick={submitForReview} loading={resubmitting} disabled={!checklist.complete} className="h-9 rounded-full bg-ensena-primary px-5 text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50">
              Submit for review
            </Button>
            <span className="text-xs">Update the items above, then submit your application again.</span>
          </div>
        </div>
      ) : checklist.complete ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Submitted — under review</p>
            <p>Everything we need is in. Our team usually reviews applications within 24–48 hours, and we&apos;ll email you when you&apos;re approved.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-amber-600" /> Your account isn&apos;t verified yet</p>
          <p className="mt-1">Complete the items below so our team can review your application.</p>
          <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {[...checklist.info, ...checklist.documents].map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                {item.done ? <CheckCircle2 className="size-4 text-ensena-success" /> : <span className="size-4 rounded-full border-2 border-amber-400" />}
                <span className={item.done ? "text-ensena-muted line-through" : ""}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tutor Information */}
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Tutor Information</h2>
        <div className="mt-2">
          <Row label="Full Name">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </Row>
          <Row label="Email Address">
            <p className="pt-2 text-sm font-medium text-ensena-ink">{me.email}</p>
          </Row>
          <Row label="Country">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select value={country} onChange={(e) => { setCountry(e.target.value); setStateCity(""); }} className={inputClass}>
                <option value="">Select country</option>
                {countryNames.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {countryData ? (
                <select value={stateCity} onChange={(e) => setStateCity(e.target.value)} className={inputClass}>
                  <option value="">Select {countryData.subdivisionLabel.toLowerCase()}</option>
                  {countryData.subdivisions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input value={stateCity} onChange={(e) => setStateCity(e.target.value)} placeholder="State / city" className={inputClass} />
              )}
            </div>
          </Row>
          <Row label="Date Joined">
            <p className="pt-2 text-sm font-medium text-ensena-ink">{formatJoined(me.joinedAt)}</p>
          </Row>
          <Row label="Account Status">
            <p className={cn("pt-2 text-sm font-semibold", verified ? "text-ensena-success" : needsChanges ? "text-rose-600" : "text-amber-600")}>
              {verified ? "Verified" : me.applicationStatus === "rejected" ? "Not approved" : me.applicationStatus === "resubmission_required" ? "Resubmission required" : "Pending verification"}
            </p>
          </Row>
          <Row label="Academic Levels">
            <div className="flex flex-wrap gap-2">
              {academicLevels.map((l) => (
                <button key={l.label} type="button" onClick={() => toggleLevel(l.label)} className={chipClass(levels.includes(l.label))}>{l.label}</button>
              ))}
            </div>
          </Row>
          <Row label="Subjects">
            {levels.length === 0 ? (
              <p className="pt-2 text-sm text-ensena-muted">Choose your academic levels first.</p>
            ) : (
              <div>
                {levels.length > 1 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {levels.map((l) => (
                      <button key={l} type="button" onClick={() => setActiveLevel(l)} className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium", activeLevel === l ? "border-ensena-primary bg-ensena-primary/5 text-ensena-ink" : "border-ensena-border text-ensena-muted")}>
                        {l} {(entryFor(l)?.items.length ?? 0) > 0 && `(${entryFor(l)?.items.length})`}
                      </button>
                    ))}
                  </div>
                )}
                {activeLevel && (
                  <LevelSubjectPicker key={activeLevel} level={activeLevel} values={entryFor(activeLevel)?.items ?? []} onChange={(items) => patchLevel(activeLevel, { items })} />
                )}
              </div>
            )}
          </Row>
          {levels.includes("Exams") && (
            <Row label="Exam Expertise">
              <div className="flex flex-wrap gap-2">
                {examOptions.map((ex) => (
                  <button key={ex} type="button" onClick={() => patchLevel("Exams", { exams: toggle(exams, ex) })} className={chipClass(exams.includes(ex))}>{ex}</button>
                ))}
              </div>
            </Row>
          )}
          <Row label="Teaching Experience">
            <select value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} className={inputClass}>
              <option value="">Select</option>
              {experienceOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Row>
          <Row label="Languages">
            <div className="flex flex-wrap gap-2">
              {[...languageOptions, ...languages.filter((l) => !(languageOptions as readonly string[]).includes(l))].map((l) => (
                <button key={l} type="button" onClick={() => setLanguages(toggle(languages, l))} className={chipClass(languages.includes(l))}>{l}</button>
              ))}
            </div>
          </Row>
          <Row label="Pricing">
            <div className="relative max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ensena-muted">₦</span>
              <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 4250" className={cn(inputClass, "pl-7 pr-14")} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ensena-muted">/ hour</span>
            </div>
          </Row>
          <Row label="Discovery Session">
            <label className="flex items-center gap-2 pt-2 text-sm text-ensena-ink">
              <input type="checkbox" checked={discovery} onChange={(e) => setDiscovery(e.target.checked)} className="size-4 accent-ensena-primary" />
              {discovery ? "Available" : "Not available"}
            </label>
          </Row>
          <Row label="Bio">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="e.g. Experienced Biology tutor specialising in secondary school and WAEC/JAMB preparation." className="w-full rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary" />
            <p className={cn("mt-1 text-xs", bio.trim().length >= 50 ? "text-ensena-muted" : "text-amber-600")}>{bio.trim().length}/50 characters minimum</p>
          </Row>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveInfo} loading={saving} className="h-10 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            Save Tutor Information
          </Button>
        </div>
      </div>

      {/* Verification Documents */}
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Verification Documents</h2>
        <p className="mt-1 text-xs text-ensena-muted">PDF, Word or image files, up to 10MB each. Only you and Ensena&apos;s verification team can see these.</p>
        <input
          ref={fileInput}
          type="file"
          accept={DOC_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void uploadDocument(file);
          }}
        />
        <div className="mt-4 flex flex-col gap-3">
          {tutorDocumentTypes.map((docType) => {
            const doc = me.documents.find((d) => d.type === docType.type);
            const busy = uploadingType === docType.type;
            const statusText = !doc ? "Not submitted" : doc.status === "approved" ? "Approved" : doc.status === "rejected" ? "Rejected — please upload again" : "Submitted";
            const statusColor = !doc ? "text-ensena-primary" : doc.status === "rejected" ? "text-rose-600" : "text-ensena-success";
            return (
              <div key={docType.type} className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border p-4">
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", doc && doc.status !== "rejected" ? "bg-ensena-success/10 text-ensena-success" : "bg-ensena-bg-soft text-ensena-muted")}>
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ensena-ink">
                    {docType.label} {docType.required ? <span className="text-ensena-primary">*</span> : <span className="text-xs font-normal text-ensena-muted">(optional)</span>}
                  </p>
                  <p className={cn("text-sm font-medium", statusColor)}>{statusText}</p>
                  {doc ? (
                    <>
                      <p className="truncate text-sm text-ensena-muted">{doc.fileName}</p>
                      <p className="text-sm text-ensena-muted">Uploaded {timeAgo(doc.uploadedAt)}</p>
                    </>
                  ) : (
                    <p className="text-xs text-ensena-muted">{docType.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {doc && (
                    <Button variant="outline" loading={openingPath === doc.storagePath} onClick={() => viewDocument(doc.storagePath, doc.fileName, docType.label)} className="h-9 rounded-full border-ensena-border px-4 text-xs font-semibold">
                      View Document
                    </Button>
                  )}
                  <Button
                    onClick={() => pickFile(docType.type)}
                    disabled={uploadingType !== null}
                    variant={doc ? "outline" : "default"}
                    className={cn("h-9 rounded-full px-4 text-xs font-semibold", doc ? "border-ensena-border" : "bg-ensena-primary text-white hover:bg-[var(--ensena-primary-hover)]")}
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} {doc ? "Replace" : "Upload"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
