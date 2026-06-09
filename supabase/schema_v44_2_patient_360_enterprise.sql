-- v44.2 Hasta Dosyası 360 Enterprise SQL
-- Ana olarak ekran güncellemesidir. Veri silmez.
-- Durum geçmişi ve bazı eksik kolonları güvenli şekilde kontrol eder.

alter table patients add column if not exists status text default 'Aktif';
alter table patients add column if not exists status_note text;
alter table patients add column if not exists status_updated_at timestamptz;

create table if not exists patient_status_history (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid references facilities(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  patient_name text,
  old_status text,
  new_status text,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table patient_status_history enable row level security;

drop policy if exists "patient status history read" on patient_status_history;
create policy "patient status history read"
on patient_status_history
for select
to authenticated
using (
  current_user_role() = 'founder'
  or facility_id = current_user_facility()
);

drop policy if exists "patient status history write" on patient_status_history;
create policy "patient status history write"
on patient_status_history
for insert
to authenticated
with check (
  current_user_role() in ('founder','manager','nurse')
  and (
    current_user_role() = 'founder'
    or facility_id = current_user_facility()
  )
);
