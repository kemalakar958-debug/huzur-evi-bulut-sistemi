-- v55.1 Hasta Ekle İşlevleri İçin Storage Bucket

insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', false)
on conflict (id) do nothing;

drop policy if exists "patient documents read" on storage.objects;
drop policy if exists "patient documents upload" on storage.objects;
drop policy if exists "patient documents update" on storage.objects;
drop policy if exists "patient documents delete" on storage.objects;

create policy "patient documents read"
on storage.objects
for select
to authenticated
using (bucket_id = 'patient-documents');

create policy "patient documents upload"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'patient-documents');

create policy "patient documents update"
on storage.objects
for update
to authenticated
using (bucket_id = 'patient-documents')
with check (bucket_id = 'patient-documents');

create policy "patient documents delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'patient-documents');
