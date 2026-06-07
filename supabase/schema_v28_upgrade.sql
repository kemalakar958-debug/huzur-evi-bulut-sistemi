
-- v28 ek SQL: Mevcut v27 kurulumunun üzerine çalıştırılabilir.

create table if not exists documents(
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  category text not null,
  title text,
  storage_path text,
  note text,
  created_at timestamptz default now()
);

alter table documents enable row level security;

drop policy if exists "documents read" on documents;
create policy "documents read" on documents for select to authenticated using(
  current_user_role()='founder' or facility_id=current_user_facility()
);

drop policy if exists "documents write" on documents;
create policy "documents write" on documents for all to authenticated using(
  current_user_role() in('founder','manager','nurse') and
  (current_user_role()='founder' or facility_id=current_user_facility())
) with check(
  current_user_role() in('founder','manager','nurse') and
  (current_user_role()='founder' or facility_id=current_user_facility())
);
