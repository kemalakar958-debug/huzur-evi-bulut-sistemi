-- v36 Kurumlar / Yönetim Paneli SQL
-- Mevcut facilities tablosunu detaylandırır. Veri silmez.

alter table facilities add column if not exists official_name text;
alter table facilities add column if not exists license_no text;
alter table facilities add column if not exists phone text;
alter table facilities add column if not exists email text;
alter table facilities add column if not exists address text;
alter table facilities add column if not exists city text;
alter table facilities add column if not exists district text;
alter table facilities add column if not exists capacity numeric;
alter table facilities add column if not exists manager_name text;
alter table facilities add column if not exists nurse_responsible text;
alter table facilities add column if not exists doctor_name text;
alter table facilities add column if not exists status text default 'Aktif';
alter table facilities add column if not exists note text;
alter table facilities add column if not exists updated_at timestamptz;

alter table facilities enable row level security;

drop policy if exists "facilities founder manager read" on facilities;
create policy "facilities founder manager read"
on facilities
for select
to authenticated
using (
  current_user_role() = 'founder'
  or id = current_user_facility()
);

drop policy if exists "facilities founder manager write" on facilities;
create policy "facilities founder manager write"
on facilities
for all
to authenticated
using (
  current_user_role() in ('founder','manager')
  and (
    current_user_role() = 'founder'
    or id = current_user_facility()
  )
)
with check (
  current_user_role() in ('founder','manager')
  and (
    current_user_role() = 'founder'
    or id = current_user_facility()
  )
);
