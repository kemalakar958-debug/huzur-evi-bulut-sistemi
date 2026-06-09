'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import RoleGuard from '@/components/RoleGuard';
import { supabase } from '@/lib/supabaseClient';

type Setting = Record<string, any>;

const tabs = [
  ['general', 'Genel Ayarlar'],
  ['clinical', 'Klinik Ayarları'],
  ['depot', 'Depo Ayarları'],
  ['patient', 'Hasta Ayarları'],
];

export default function SystemSettingsPage() {
  return (
    <Shell>
      <RoleGuard allowedRoles={['founder']} title="Sistem Ayarları">
        <SystemSettingsContent />
      </RoleGuard>
    </Shell>
  );
}

function SystemSettingsContent() {
  const [tab, setTab] = useState('general');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [form, setForm] = useState({
    category: 'general',
    setting_key: '',
    setting_value: '',
    description: '',
    is_active: true,
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .order('category')
      .order('setting_key');

    setSettings(data || []);
  }

  async function saveSetting() {
    if (!form.setting_key) return alert('Ayar anahtarı zorunlu.');
    if (!form.setting_value) return alert('Ayar değeri zorunlu.');

    const { error } = await supabase.from('system_settings').insert({
      category: form.category,
      setting_key: form.setting_key,
      setting_value: form.setting_value,
      description: form.description || null,
      is_active: form.is_active,
    });

    if (error) return alert(error.message);

    setForm((old) => ({ ...old, setting_key: '', setting_value: '', description: '', is_active: true }));
    await load();
  }

  async function toggleSetting(row: Setting) {
    const { error } = await supabase
      .from('system_settings')
      .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (error) return alert(error.message);
    await load();
  }

  async function updateValue(row: Setting, value: string) {
    const { error } = await supabase
      .from('system_settings')
      .update({ setting_value: value, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (error) return alert(error.message);
    await load();
  }

  async function seedDefaults() {
    const defaults = [
      ['general', 'system_name', 'İlgi Klinik Bulut', 'Sistem adı'],
      ['general', 'default_theme', 'kurumsal', 'Varsayılan tema'],
      ['clinical', 'treatment_types', 'Serum,Antibiyotik,Enjeksiyon,Dıştan Tedavi,Özel Tedavi,Nebül,Oksijen', 'Tedavi türleri'],
      ['clinical', 'incident_types', 'Düşme,Yaralanma,Kriz,Davranışsal Olay,Kaybolma Riski,Diğer', 'Olay türleri'],
      ['clinical', 'patient_statuses', 'Aktif,Hastanede,İzinli,Vefat,Kendi İsteğiyle Çıktı,Taburcu,Nakil,Arşiv,Pasif', 'Hasta durumları'],
      ['depot', 'depot_categories', 'İlaç,Serum,Sarf Malzeme,Medikal Cihaz,Temizlik,Diğer', 'Depo kategorileri'],
      ['depot', 'critical_stock_mode', 'aktif', 'Kritik stok takibi'],
      ['patient', 'required_documents', 'Kimlik Fotokopisi,Medula PDF,Epikriz', 'Zorunlu evraklar'],
    ];

    for (const [category, key, value, description] of defaults) {
      await supabase.from('system_settings').upsert({
        category,
        setting_key: key,
        setting_value: value,
        description,
        is_active: true,
      }, { onConflict: 'setting_key' });
    }

    await load();
    alert('Varsayılan ayarlar eklendi/güncellendi.');
  }

  const visible = settings.filter((s) => s.category === tab);

  return (
    <>
      <div className="hero">
        <h2>Sistem Ayarları Merkezi</h2>
        <p>Kurucu için genel sistem, klinik, depo ve hasta ayarlarını tek merkezde topla.</p>
      </div>

      <div className="panel">
        <div className="actions" style={{ marginTop: 0 }}>
          {tabs.map(([key, label]) => (
            <button key={key} className={tab === key ? 'primary' : 'soft'} onClick={() => setTab(key)}>{label}</button>
          ))}
          <button className="green" onClick={seedDefaults}>Varsayılanları Kur</button>
        </div>
      </div>

      <div className="grid grid2">
        <div className="panel">
          <div className="panelHead"><div><h2>Yeni Ayar Ekle</h2><p>Ayarları kategoriye göre kaydet.</p></div></div>

          <div className="grid grid2">
            <div>
              <label>Kategori</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {tabs.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div><label>Anahtar</label><input value={form.setting_key} onChange={(e) => setForm({ ...form, setting_key: e.target.value })} placeholder="örn: treatment_types" /></div>
          </div>

          <div><label>Değer</label><textarea value={form.setting_value} onChange={(e) => setForm({ ...form, setting_value: e.target.value })} /></div>
          <div><label>Açıklama</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          <div className="actions">
            <button className="primary" onClick={saveSetting}>Ayar Kaydet</button>
          </div>
        </div>

        <div className="panel">
          <h2>Nasıl kullanılacak?</h2>
          <p>Bu ekran ayarları merkezi olarak tutar. Sonraki v44.2 paketinde formlar bu ayarları okuyarak dropdown listelerini buradan besleyecek.</p>
          <div className="notice">Örnek: Tedavi türleri, olay türleri, hasta durumları ve depo kategorileri buradan yönetilecek.</div>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead"><div><h2>{tabs.find(([key]) => key === tab)?.[1]}</h2><p>{visible.length} ayar</p></div></div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Anahtar</th><th>Değer</th><th>Açıklama</th><th>Durum</th><th>İşlem</th></tr></thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td><b>{row.setting_key}</b></td>
                  <td><textarea defaultValue={row.setting_value || ''} onBlur={(e) => updateValue(row, e.target.value)} /></td>
                  <td>{row.description || '-'}</td>
                  <td><span className={`pill ${row.is_active ? 'ok' : 'danger'}`}>{row.is_active ? 'Aktif' : 'Pasif'}</span></td>
                  <td><button className="soft" onClick={() => toggleSetting(row)}>{row.is_active ? 'Pasifleştir' : 'Aktifleştir'}</button></td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={5}>Ayar yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
