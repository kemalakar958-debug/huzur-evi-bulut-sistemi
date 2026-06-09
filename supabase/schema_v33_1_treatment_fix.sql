create table if not exists treatment_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  patient_name text,
  treatment_date date not null default current_date,
  treatment_time text,
  treatment_type text not null,
  treatment_name text,
  route text,
  dose text,
  frequency text,
  applied_by text,
  doctor_name text,
  status text default 'Uygulandı',
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table treatment_records enable row level security;

drop policy if exists "treatments read" on treatment_records;
create policy "treatments read"
on treatment_records
for select
to authenticated
using (
  current_user_role() = 'founder'
  or facility_id = current_user_facility()
);

drop policy if exists "treatments write" on treatment_records;
create policy "treatments write"
on treatment_records
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
