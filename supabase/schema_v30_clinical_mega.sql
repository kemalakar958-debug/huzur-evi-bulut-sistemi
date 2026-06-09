-- v30 Klinik Mega Paket SQL
-- Finans, WhatsApp, yapay zeka ve barkod içermez.

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
  incident_at timestamptz default now(),
  incident_type text,
  location text,
  severity text,
  description text,
  intervention text,
  relative_notified boolean default false,
  notified_person text,
  status text default 'Aktif',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists hospital_transfers (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  patient_name text,
  transfer_at timestamptz default now(),
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

create table if not exists mar_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  patient_name text,
  medication_id uuid references medications(id) on delete set null,
  medication_name text,
  dose_time text,
  scheduled_date date default current_date,
  status text default 'Bekliyor',
  note text,
  administered_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists care_tasks (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  task_type text,
  title text,
  due_at timestamptz,
  priority text default 'Normal',
  status text default 'Bekliyor',
  assigned_to text,
  note text,
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists shift_handovers (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  shift_date date default current_date,
  shift_type text,
  handed_by text,
  received_by text,
  critical_patients text,
  medication_notes text,
  incident_notes text,
  pending_tasks text,
  general_note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists care_plans (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  plan_type text,
  risk_level text,
  goal text,
  plan_note text,
  responsible text,
  review_date date,
  status text default 'Aktif',
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists daily_care_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  care_at timestamptz,
  care_type text,
  status text,
  performed_by text,
  note text,
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists nutrition_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  record_at timestamptz,
  meal_type text,
  intake_status text,
  fluid_ml numeric,
  diet_note text,
  status text,
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists wound_care_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  record_at timestamptz,
  wound_location text,
  wound_stage text,
  dressing_type text,
  wound_note text,
  status text default 'Aktif',
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists appointment_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  appointment_at timestamptz,
  appointment_type text,
  department text,
  doctor_name text,
  result_note text,
  status text default 'Bekliyor',
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table vital_records enable row level security;
alter table incident_records enable row level security;
alter table hospital_transfers enable row level security;
alter table mar_records enable row level security;
alter table care_tasks enable row level security;
alter table shift_handovers enable row level security;
alter table care_plans enable row level security;
alter table daily_care_records enable row level security;
alter table nutrition_records enable row level security;
alter table wound_care_records enable row level security;
alter table appointment_records enable row level security;

-- Ortak RLS policy üretimi
do $$
declare
  t text;
begin
  foreach t in array array[
    'vital_records','incident_records','hospital_transfers','mar_records','care_tasks','shift_handovers',
    'care_plans','daily_care_records','nutrition_records','wound_care_records','appointment_records'
  ]
  loop
    execute format('drop policy if exists "%s read" on %I', t, t);
    execute format('create policy "%s read" on %I for select to authenticated using (current_user_role()=''founder'' or facility_id=current_user_facility())', t, t);

    execute format('drop policy if exists "%s write" on %I', t, t);
    execute format('create policy "%s write" on %I for all to authenticated using (current_user_role() in (''founder'',''manager'',''nurse'') and (current_user_role()=''founder'' or facility_id=current_user_facility())) with check (current_user_role() in (''founder'',''manager'',''nurse'') and (current_user_role()=''founder'' or facility_id=current_user_facility()))', t, t);
  end loop;
end $$;
