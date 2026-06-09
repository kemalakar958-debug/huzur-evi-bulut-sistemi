-- v36.1 Yönetici Yetki Koruma SQL
-- Amaç: Yönetim ve kurum ayarlarını sadece founder/manager rolleri kullanabilsin.
-- Hemşire kullanıcıları sadece kendi kurumundaki RLS izinli operasyon verilerine erişir.

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

-- İsteğe bağlı rol kontrolü:
-- profiles tablosunda role değeri founder veya manager olan kullanıcılar yönetim ekranına girebilir.
-- nurse/viewer kullanıcıları uygulama içinde engellenir, RLS tarafında da kurum dışı verileri göremez.
