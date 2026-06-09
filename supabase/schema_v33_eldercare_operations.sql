-- v33 Yaşlı Bakım Operasyon SQL
-- Supabase SQL Editor içinde çalıştır.

create table if not exists activity_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  activity_at timestamptz,
  activity_type text,
  participation text,
  mood text,
  social_note text,
  status text default 'Aktif',
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists physio_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  exercise_at timestamptz,
  exercise_type text,
  duration_min numeric,
  tolerance text,
  performed_by text,
  note text,
  status text default 'Aktif',
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists sleep_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  sleep_date date,
  sleep_quality text,
  hours_slept numeric,
  night_wake_count numeric,
  restlessness text,
  note text,
  status text default 'Normal',
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists behavior_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  record_at timestamptz,
  behavior_type text,
  severity text,
  trigger_note text,
  intervention text,
  status text default 'Aktif',
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists visitor_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  visit_at timestamptz,
  visitor_name text,
  relation text,
  phone text,
  exit_time text,
  visit_note text,
  status text default 'İçeride',
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists risk_score_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  score_date date,
  fall_risk text,
  pressure_risk text,
  nutrition_risk text,
  wandering_risk text,
  general_note text,
  status text default 'Aktif',
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists room_bed_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  floor_no text,
  room_no text,
  bed_no text,
  bed_status text default 'Boş',
  patient_name text,
  note text,
  created_at timestamptz default now()
);

alter table activity_records enable row level security;
alter table physio_records enable row level security;
alter table sleep_records enable row level security;
alter table behavior_records enable row level security;
alter table visitor_records enable row level security;
alter table risk_score_records enable row level security;
alter table room_bed_records enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'activity_records',
    'physio_records',
    'sleep_records',
    'behavior_records',
    'visitor_records',
    'risk_score_records',
    'room_bed_records'
  ]
  loop
    execute format('drop policy if exists "%s read" on %I', t, t);
    execute format('create policy "%s read" on %I for select to authenticated using (current_user_role()=''founder'' or facility_id=current_user_facility())', t, t);

    execute format('drop policy if exists "%s write" on %I', t, t);
    execute format('create policy "%s write" on %I for all to authenticated using (current_user_role() in (''founder'',''manager'',''nurse'') and (current_user_role()=''founder'' or facility_id=current_user_facility())) with check (current_user_role() in (''founder'',''manager'',''nurse'') and (current_user_role()=''founder'' or facility_id=current_user_facility()))', t, t);
  end loop;
end $$;
