-- v47 Hastane Süreç Merkezi SQL

insert into storage.buckets (id, name, public)
values ('hospital-documents', 'hospital-documents', false)
on conflict (id) do nothing;

create table if not exists hospital_cases (
  id uuid primary key default uuid_generate_v4(),

  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  patient_name text,

  departure_at timestamptz default now(),
  hospital_name text not null,
  clinic_name text,
  doctor_name text,
  referral_reason text not null,

  transport_type text,
  ambulance_info text,
  companion_name text,
  sent_by text,

  status text default 'Sevk Edildi',
  note text,

  returned_at timestamptz,
  result_summary text,
  diagnosis_result text,
  new_medications text,
  new_treatments text,
  control_date date,
  return_note text,

  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz
);

create table if not exists hospital_documents (
  id uuid primary key default uuid_generate_v4(),

  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  case_id uuid references hospital_cases(id) on delete cascade,

  patient_name text,
  document_type text not null,
  title text,
  note text,
  storage_path text,

  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists hospital_followups (
  id uuid primary key default uuid_generate_v4(),

  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  case_id uuid references hospital_cases(id) on delete cascade,

  patient_name text,
  followup_type text,
  status text,
  note text,

  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table hospital_cases enable row level security;
alter table hospital_documents enable row level security;
alter table hospital_followups enable row level security;

drop policy if exists "hospital cases read" on hospital_cases;
create policy "hospital cases read"
on hospital_cases
for select
to authenticated
using (
  current_user_role() = 'founder'
  or facility_id = current_user_facility()
);

drop policy if exists "hospital cases write" on hospital_cases;
create policy "hospital cases write"
on hospital_cases
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

drop policy if exists "hospital documents read" on hospital_documents;
create policy "hospital documents read"
on hospital_documents
for select
to authenticated
using (
  current_user_role() = 'founder'
  or facility_id = current_user_facility()
);

drop policy if exists "hospital documents write" on hospital_documents;
create policy "hospital documents write"
on hospital_documents
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

drop policy if exists "hospital followups read" on hospital_followups;
create policy "hospital followups read"
on hospital_followups
for select
to authenticated
using (
  current_user_role() = 'founder'
  or facility_id = current_user_facility()
);

drop policy if exists "hospital followups write" on hospital_followups;
create policy "hospital followups write"
on hospital_followups
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

drop policy if exists "hospital document files read" on storage.objects;
create policy "hospital document files read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'hospital-documents'
);

drop policy if exists "hospital document files upload" on storage.objects;
create policy "hospital document files upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'hospital-documents'
  and current_user_role() in ('founder','manager','nurse')
);
