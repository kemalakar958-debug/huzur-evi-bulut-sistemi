-- v35 Hasta Kabul / Ayrılış / Vefat / Arşiv SQL

create table if not exists admission_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  patient_name text,
  admission_date date not null default current_date,
  admission_type text default 'Yeni Kabul',
  room_no text,
  bed_no text,
  brought_by text,
  relation text,
  initial_condition text,
  diagnosis_summary text,
  allergy_note text,
  medication_note text,
  belongings_checked text default 'Hayır',
  documents_checked text default 'Hayır',
  consent_checked text default 'Hayır',
  status text default 'Aktif',
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists exit_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  patient_name text,
  exit_date date not null default current_date,
  exit_type text default 'Taburcu',
  destination text,
  taken_by text,
  relation text,
  reason text,
  belongings_returned text default 'Hayır',
  documents_returned text default 'Hayır',
  archive_status text default 'Arşive Alınacak',
  death_time text,
  death_place text,
  death_doctor text,
  death_note text,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table admission_records enable row level security;
alter table exit_records enable row level security;

drop policy if exists "admissions read" on admission_records;
create policy "admissions read"
on admission_records
for select
to authenticated
using (
  current_user_role() = 'founder'
  or facility_id = current_user_facility()
);

drop policy if exists "admissions write" on admission_records;
create policy "admissions write"
on admission_records
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

drop policy if exists "exits read" on exit_records;
create policy "exits read"
on exit_records
for select
to authenticated
using (
  current_user_role() = 'founder'
  or facility_id = current_user_facility()
);

drop policy if exists "exits write" on exit_records;
create policy "exits write"
on exit_records
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
