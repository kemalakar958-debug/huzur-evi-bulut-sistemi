-- v48 Kapalı Kullanıcı Oluşturma / Yetki Paneli SQL
-- Veri silmez. Profiles tablosuna aktiflik ve temel kullanıcı alanları ekler.

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists role text default 'viewer';
alter table profiles add column if not exists facility_id uuid references facilities(id) on delete set null;
alter table profiles add column if not exists is_active boolean default true;
alter table profiles add column if not exists created_at timestamptz default now();
alter table profiles add column if not exists updated_at timestamptz;

alter table profiles enable row level security;

drop policy if exists "profiles read own or founder" on profiles;
create policy "profiles read own or founder"
on profiles
for select
to authenticated
using (
  auth.uid() = id
  or current_user_role() = 'founder'
);

drop policy if exists "profiles founder insert" on profiles;
create policy "profiles founder insert"
on profiles
for insert
to authenticated
with check (
  current_user_role() = 'founder'
);

drop policy if exists "profiles founder update" on profiles;
create policy "profiles founder update"
on profiles
for update
to authenticated
using (
  current_user_role() = 'founder'
)
with check (
  current_user_role() = 'founder'
);

-- Not:
-- Supabase Auth tarafında kullanıcı oluşturma uygulama içinden signUp ile yapılır.
-- Profil satırı bu panel tarafından profiles tablosuna yazılır.
-- Mevcut kullanıcıların role/facility ayarları bu panelden düzenlenebilir.
