-- v51.1 Hatırlatıcı Yetki Düzeltme SQL
-- Hemşire: sadece Hasta Hastane Randevusu görebilir/yazabilir.
-- Müdür ve Kurucu: tüm hatırlatıcı türlerini görebilir/yazabilir.

drop policy if exists "reminder records read" on reminder_records;

create policy "reminder records read"
on reminder_records
for select
to authenticated
using (
  (
    current_user_role() in ('founder','manager')
    and (
      current_user_role() = 'founder'
      or facility_id = current_user_facility()
    )
  )
  or
  (
    current_user_role() = 'nurse'
    and facility_id = current_user_facility()
    and reminder_type = 'Hasta Hastane Randevusu'
  )
);

drop policy if exists "reminder records write" on reminder_records;

create policy "reminder records write"
on reminder_records
for all
to authenticated
using (
  (
    current_user_role() in ('founder','manager')
    and (
      current_user_role() = 'founder'
      or facility_id = current_user_facility()
    )
  )
  or
  (
    current_user_role() = 'nurse'
    and facility_id = current_user_facility()
    and reminder_type = 'Hasta Hastane Randevusu'
  )
)
with check (
  (
    current_user_role() in ('founder','manager')
    and (
      current_user_role() = 'founder'
      or facility_id = current_user_facility()
    )
  )
  or
  (
    current_user_role() = 'nurse'
    and facility_id = current_user_facility()
    and reminder_type = 'Hasta Hastane Randevusu'
  )
);
