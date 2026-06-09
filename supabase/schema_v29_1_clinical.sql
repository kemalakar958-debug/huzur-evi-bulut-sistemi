-- v29.1 Klinik Operasyon SQL
-- Supabase SQL Editor içinde çalıştır.

create table if not exists vital_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  patient_name text,
  measured_at timestamptz not null default now(),
  systolic numeric,
  diastolic numeric,
  pulse numeric,
  temperature numeric,
  spo2 numeric,
  blood_glucose numeric,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists incident_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  patient_name text,
  incident_at timestamptz not null default now(),
  incident_type text not null,
  location text,
  severity text default 'Orta',
  description text,
  intervention text,
  relative_notified boolean default false,
  notified_person text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists hospital_transfers (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  patient_name text,
  transfer_at timestamptz not null default now(),
  return_at timestamptz,
  hospital_name text,
  reason text,
  companion text,
  transport_type text,
  status text default 'Hastanede',
  result_note text,
  relative_notified boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table vital_records enable row level security;
alter table incident_records enable row level security;
alter table hospital_transfers enable row level security;

drop policy if exists "vitals read" on vital_records;
create policy "vitals read" on vital_records for select to authenticated using (current_user_role()='founder' or facility_id=current_user_facility());

drop policy if exists "vitals write" on vital_records;
create policy "vitals write" on vital_records for all to authenticated using (current_user_role() in ('founder','manager','nurse') and (current_user_role()='founder' or facility_id=current_user_facility())) with check (current_user_role() in ('founder','manager','nurse') and (current_user_role()='founder' or facility_id=current_user_facility()));

drop policy if exists "incidents read" on incident_records;
create policy "incidents read" on incident_records for select to authenticated using (current_user_role()='founder' or facility_id=current_user_facility());

drop policy if exists "incidents write" on incident_records;
create policy "incidents write" on incident_records for all to authenticated using (current_user_role() in ('founder','manager','nurse') and (current_user_role()='founder' or facility_id=current_user_facility())) with check (current_user_role() in ('founder','manager','nurse') and (current_user_role()='founder' or facility_id=current_user_facility()));

drop policy if exists "transfers read" on hospital_transfers;
create policy "transfers read" on hospital_transfers for select to authenticated using (current_user_role()='founder' or facility_id=current_user_facility());

drop policy if exists "transfers write" on hospital_transfers;
create policy "transfers write" on hospital_transfers for all to authenticated using (current_user_role() in ('founder','manager','nurse') and (current_user_role()='founder' or facility_id=current_user_facility())) with check (current_user_role() in ('founder','manager','nurse') and (current_user_role()='founder' or facility_id=current_user_facility()));
