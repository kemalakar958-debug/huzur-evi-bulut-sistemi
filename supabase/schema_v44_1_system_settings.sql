-- v44.1 Sistem Ayarları Merkezi SQL

create table if not exists system_settings (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  setting_key text not null unique,
  setting_value text not null,
  description text,
  is_active boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table system_settings enable row level security;

drop policy if exists "system settings read" on system_settings;
create policy "system settings read"
on system_settings
for select
to authenticated
using (
  current_user_role() = 'founder'
  or is_active = true
);

drop policy if exists "system settings write founder" on system_settings;
create policy "system settings write founder"
on system_settings
for all
to authenticated
using (
  current_user_role() = 'founder'
)
with check (
  current_user_role() = 'founder'
);

insert into system_settings (category, setting_key, setting_value, description, is_active)
values
('general', 'system_name', 'İlgi Klinik Bulut', 'Sistem adı', true),
('general', 'default_theme', 'kurumsal', 'Varsayılan tema', true),
('clinical', 'treatment_types', 'Serum,Antibiyotik,Enjeksiyon,Dıştan Tedavi,Özel Tedavi,Nebül,Oksijen', 'Tedavi türleri', true),
('clinical', 'incident_types', 'Düşme,Yaralanma,Kriz,Davranışsal Olay,Kaybolma Riski,Diğer', 'Olay türleri', true),
('clinical', 'patient_statuses', 'Aktif,Hastanede,İzinli,Vefat,Kendi İsteğiyle Çıktı,Taburcu,Nakil,Arşiv,Pasif', 'Hasta durumları', true),
('depot', 'depot_categories', 'İlaç,Serum,Sarf Malzeme,Medikal Cihaz,Temizlik,Diğer', 'Depo kategorileri', true),
('depot', 'critical_stock_mode', 'aktif', 'Kritik stok takibi', true),
('patient', 'required_documents', 'Kimlik Fotokopisi,Medula PDF,Epikriz', 'Zorunlu evraklar', true)
on conflict (setting_key) do update
set setting_value = excluded.setting_value,
    description = excluded.description,
    is_active = excluded.is_active,
    updated_at = now();
