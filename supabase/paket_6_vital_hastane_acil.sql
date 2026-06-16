-- Paket 6 — Vital Takip + Hastane Sevk + Acil Durum Kartı SQL
-- Veri silmez. Eksik tablolar/kolonlar varsa ekler.

create table if not exists vital_records (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  patient_name text,
  measured_at timestamptz default now(),
  systolic numeric,
  diastolic numeric,
  pulse numeric,
  temperature numeric,
  spo2 numeric,
  blood_sugar numeric,
  respiration numeric,
  weight numeric,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table vital_records enable row level security;

drop policy if exists "vital records read" on vital_records;
drop policy if exists "vital records write" on vital_records;

create policy "vital records read"
on vital_records
for select
to authenticated
using (
  current_user_role() = 'founder'
  or facility_id = current_user_facility()
);

create policy "vital records write"
on vital_records
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

create table if not exists hospital_cases (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  patient_name text,
  departure_at timestamptz default now(),
  hospital_name text,
  department text,
  doctor_name text,
  reason text,
  companion_name text,
  ambulance text default 'Hayır',
  status text default 'Hastanede',
  diagnosis text,
  treatment_result text,
  return_at timestamptz,
  control_date date,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table hospital_cases enable row level security;

drop policy if exists "hospital cases read" on hospital_cases;
drop policy if exists "hospital cases write" on hospital_cases;

create policy "hospital cases read"
on hospital_cases
for select
to authenticated
using (
  current_user_role() = 'founder'
  or facility_id = current_user_facility()
);

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

alter table hospital_cases add column if not exists department text;
alter table hospital_cases add column if not exists doctor_name text;
alter table hospital_cases add column if not exists reason text;
alter table hospital_cases add column if not exists companion_name text;
alter table hospital_cases add column if not exists ambulance text default 'Hayır';
alter table hospital_cases add column if not exists diagnosis text;
alter table hospital_cases add column if not exists treatment_result text;
alter table hospital_cases add column if not exists return_at timestamptz;
alter table hospital_cases add column if not exists control_date date;

create index if not exists idx_vital_records_patient_id
on vital_records(patient_id);

create index if not exists idx_vital_records_facility_measured
on vital_records(facility_id, measured_at);

create index if not exists idx_hospital_cases_patient_id
on hospital_cases(patient_id);

create index if not exists idx_hospital_cases_status
on hospital_cases(status);

create index if not exists idx_hospital_cases_facility_departure
on hospital_cases(facility_id, departure_at);
