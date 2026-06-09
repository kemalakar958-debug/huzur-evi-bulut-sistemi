-- v42 Rol Bazlı Panel / Kurum Yetkilendirme SQL
-- Amaç:
-- founder: tüm kurumları ve kurucu panelini görür
-- manager: sadece kendi kurumunu görür, kurucu panelini görmez
-- nurse: sadece kendi kurumunu görür
-- viewer: sadece kendi kurumunu görüntüler

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists role text default 'viewer';
alter table profiles add column if not exists facility_id uuid references facilities(id) on delete set null;

alter table profiles enable row level security;
alter table facilities enable row level security;

drop policy if exists "profiles read role system" on profiles;
create policy "profiles read role system"
on profiles
for select
to authenticated
using (
  auth.uid() = id
  or current_user_role() = 'founder'
);

drop policy if exists "profiles update founder only" on profiles;
create policy "profiles update founder only"
on profiles
for update
to authenticated
using (
  current_user_role() = 'founder'
)
with check (
  current_user_role() = 'founder'
);

drop policy if exists "facilities role based read" on facilities;
create policy "facilities role based read"
on facilities
for select
to authenticated
using (
  current_user_role() = 'founder'
  or id = current_user_facility()
);

drop policy if exists "facilities founder write only" on facilities;
create policy "facilities founder write only"
on facilities
for all
to authenticated
using (
  current_user_role() = 'founder'
)
with check (
  current_user_role() = 'founder'
);

-- Önemli:
-- Diğer hasta/ilaç/depo/tedavi tablolarında zaten facility_id = current_user_facility()
-- mantığı varsa manager/nurse sadece kendi kurumunu görür.
-- Founder role tüm kurumları görebilmelidir.
