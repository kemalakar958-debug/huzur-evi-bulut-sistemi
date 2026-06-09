-- v34 Emanet Eşya / Kıyafet Envanteri SQL

insert into storage.buckets (id, name, public)
values ('belonging-photos', 'belonging-photos', false)
on conflict (id) do nothing;

create table if not exists belonging_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  patient_name text,
  item_group text default 'Kıyafet',
  item_type text,
  item_name text,
  brand text,
  model text,
  color text,
  size text,
  serial_no text,
  quantity numeric default 1,
  condition_status text default 'İyi',
  storage_location text,
  delivered_by text,
  received_by text,
  status text default 'Teslim Alındı',
  note text,
  photo_path text,
  returned_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table belonging_records enable row level security;

drop policy if exists "belongings read" on belonging_records;
create policy "belongings read"
on belonging_records
for select
to authenticated
using (
  current_user_role() = 'founder'
  or facility_id = current_user_facility()
);

drop policy if exists "belongings write" on belonging_records;
create policy "belongings write"
on belonging_records
for all
to authenticated
using (
  current_user_role() in ('founder','manager','nurse')
  and (
    current_user_role() = 'founder'
    or facility_id = current_user_facility()
  )
)
with check (
  current_user_role() in ('founder','manager','nurse')
  and (
    current_user_role() = 'founder'
    or facility_id = current_user_facility()
  )
);

drop policy if exists "belonging photos read" on storage.objects;
create policy "belonging photos read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'belonging-photos'
);

drop policy if exists "belonging photos upload" on storage.objects;
create policy "belonging photos upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'belonging-photos'
  and current_user_role() in ('founder','manager','nurse')
);
