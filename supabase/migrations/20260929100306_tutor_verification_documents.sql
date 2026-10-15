-- Tutor verification documents (Government ID, Academic Certificate,
-- Teaching Qualification, Other). One row per type per tutor; the file
-- lives in the private "tutor-documents" bucket under <tutor id>/.
create table if not exists public.tutor_verification_documents (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null check (doc_type in ('government_id', 'academic_certificate', 'teaching_qualification', 'other')),
  file_name text not null,
  storage_path text not null,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (tutor_id, doc_type)
);

alter table public.tutor_verification_documents enable row level security;

create policy tutor_docs_select on public.tutor_verification_documents
  for select to authenticated
  using (
    tutor_id = (select auth.uid())
    or (select private.is_admin())
    or (select private.has_permission('tutor_verification'::text, 'view'::text))
  );

-- Tutors add/replace/remove their own documents; a (re)upload always goes
-- back to 'submitted' for review.
create policy tutor_docs_insert_own on public.tutor_verification_documents
  for insert to authenticated
  with check (tutor_id = (select auth.uid()) and status = 'submitted');

create policy tutor_docs_update on public.tutor_verification_documents
  for update to authenticated
  using (tutor_id = (select auth.uid()) or (select private.is_admin()) or (select private.has_permission('tutor_verification'::text, 'approve'::text)))
  with check (
    (tutor_id = (select auth.uid()) and status = 'submitted')
    or (select private.is_admin())
    or (select private.has_permission('tutor_verification'::text, 'approve'::text))
  );

create policy tutor_docs_delete_own on public.tutor_verification_documents
  for delete to authenticated
  using (tutor_id = (select auth.uid()));

-- Private bucket: 10MB, PDF or image.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tutor-documents', 'tutor-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy tutor_documents_owner_all on storage.objects
  for all to authenticated
  using (bucket_id = 'tutor-documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'tutor-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy tutor_documents_reviewer_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tutor-documents'
    and ((select private.is_admin()) or (select private.has_permission('tutor_verification'::text, 'view'::text)))
  );
