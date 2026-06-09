'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import RoleGuard from '@/components/RoleGuard';
import { supabase } from '@/lib/supabaseClient';

type Facility = Record<string, any>;
type Profile = Record<string, any>;

const roles = [
  ['manager', 'Müdür'],
  ['nurse', 'Hemşire'],
  ['viewer', 'Görüntüleyici'],
  ['founder', 'Kurucu / Founder'],
];

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
  let pass = '';
  for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export default function UserAdminPage() {
  return (
    <Shell>
      <RoleGuard allowedRoles={['founder']} title="Kullanıcı Oluştur / Yetki Paneli">
        <UserAdminContent />
      </RoleGuard>
    </Shell>
  );
}

function UserAdminContent() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [createdInfo, setCreatedInfo] = useState<any | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: randomPassword(),
    role: 'nurse',
    facility_id: '',
    is_active: true,
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: f } = await supabase.from('facilities').select('*').order('name');
    setFacilities(f || []);
    if (f?.[0]) setForm((old) => ({ ...old, facility_id: old.facility_id || f[0].id }));

    const { data: p } = await supabase.from('profiles').select('*').order('full_name');
    setProfiles(p || []);
  }

  async function createUser() {
    if (!form.full_name) return alert('Ad soyad zorunlu.');
    if (!form.email) return alert('E-posta zorunlu.');
    if (!form.password || form.password.length < 6) return alert('Şifre en az 6 karakter olmalı.');
    if (form.role !== 'founder' && !form.facility_id) return alert('Kurum seç.');

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          role: form.role,
          facility_id: form.role === 'founder' ? null : form.facility_id,
        },
      },
    });

    if (error) return alert(error.message);

    const userId = data.user?.id;

    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: form.full_name,
        role: form.role,
        facility_id: form.role === 'founder' ? null : form.facility_id,
        is_active: form.is_active,
      });
    }

    setCreatedInfo({
      email: form.email,
      password: form.password,
      full_name: form.full_name,
      role: form.role,
      facility: facilities.find((x) => x.id === form.facility_id)?.name || '-',
    });

    setForm({
      full_name: '',
      email: '',
      password: randomPassword(),
      role: 'nurse',
      facility_id: facilities[0]?.id || '',
      is_active: true,
    });

    await load();
    alert('Kullanıcı oluşturuldu. Giriş bilgilerini personele ver.');
  }

  async function updateProfile(profile: Profile, patch: Record<string, any>) {
    const next = { ...profile, ...patch };

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: next.full_name || null,
        role: next.role,
        facility_id: next.role === 'founder' ? null : next.facility_id,
        is_active: next.is_active,
      })
      .eq('id', profile.id);

    if (error) return alert(error.message);
    await load();
  }

  async function resetPasswordInfo(profile: Profile) {
    alert('Şifre sıfırlama için Supabase Auth > Users alanından ilgili kullanıcıya yeni şifre ver veya şifre sıfırlama e-postası gönder. Güvenlik için mevcut şifre burada görüntülenemez.');
  }

  const activeCount = profiles.filter((p) => p.is_active !== false).length;
  const managers = profiles.filter((p) => p.role === 'manager').length;
  const nurses = profiles.filter((p) => p.role === 'nurse').length;
  const viewers = profiles.filter((p) => p.role === 'viewer').length;

  return (
    <>
      <div className="hero">
        <h2>Kullanıcı Oluştur / Yetki Paneli</h2>
        <p>Kapalı üyelik sistemi: kullanıcıyı founder oluşturur, rol ve kurum atar, geçici şifre verir.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Aktif Kullanıcı</span><strong>{activeCount}</strong></div>
        <div className="kpi"><span>Müdür</span><strong>{managers}</strong></div>
        <div className="kpi"><span>Hemşire</span><strong>{nurses}</strong></div>
        <div className="kpi"><span>Görüntüleyici</span><strong>{viewers}</strong></div>
      </div>

      {createdInfo && (
        <div className="panel">
          <h2>Personele Verilecek Giriş Bilgisi</h2>
          <div className="notice">
            <b>Ad Soyad:</b> {createdInfo.full_name}<br />
            <b>E-posta:</b> {createdInfo.email}<br />
            <b>Geçici Şifre:</b> {createdInfo.password}<br />
            <b>Rol:</b> {createdInfo.role}<br />
            <b>Kurum:</b> {createdInfo.facility}
          </div>
          <p>Personel ilk girişten sonra şifresini değiştirmeli.</p>
        </div>
      )}

      <div className="grid grid2">
        <div className="panel">
          <div className="panelHead">
            <div>
              <h2>Yeni Kullanıcı Oluştur</h2>
              <p>Rastgele üyelik kapalıdır; kullanıcıyı sadece founder oluşturur.</p>
            </div>
          </div>

          <div className="grid grid2">
            <div><label>Ad Soyad</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><label>E-posta</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>

          <div className="grid grid2">
            <div><label>Geçici Şifre</label><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="actions" style={{ alignItems: 'end' }}><button className="soft" onClick={() => setForm({ ...form, password: randomPassword() })}>Yeni Şifre Üret</button></div>
          </div>

          <div className="grid grid2">
            <div>
              <label>Rol</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <div>
              <label>Kurum</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value })} disabled={form.role === 'founder'}>
                <option value="">Kurum seç</option>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>

          <div className="actions">
            <button className="primary" onClick={createUser}>Kullanıcı Oluştur</button>
          </div>
        </div>

        <div className="panel">
          <h2>Yetki Mantığı</h2>
          <div className="notice"><b>Founder:</b> Tüm kurumlar + tüm yönetim ekranları</div>
          <div className="notice"><b>Müdür:</b> Sadece atanmış kurum</div>
          <div className="notice"><b>Hemşire:</b> Sadece atanmış kurum + klinik işlemler</div>
          <div className="notice"><b>Viewer:</b> Sadece görüntüleme</div>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Kullanıcı Listesi</h2>
            <p>Rol, kurum ve aktif/pasif durumunu buradan yönet.</p>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Rol</th>
                <th>Kurum</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      value={p.full_name || ''}
                      onChange={(e) => setProfiles((old) => old.map((x) => x.id === p.id ? { ...x, full_name: e.target.value } : x))}
                      onBlur={(e) => updateProfile(p, { full_name: e.target.value })}
                    />
                    <small>{p.id}</small>
                  </td>
                  <td>
                    <select value={p.role || 'viewer'} onChange={(e) => updateProfile(p, { role: e.target.value })}>
                      {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      value={p.facility_id || ''}
                      onChange={(e) => updateProfile(p, { facility_id: e.target.value || null })}
                      disabled={p.role === 'founder'}
                    >
                      <option value="">Kurum seç</option>
                      {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </td>
                  <td><span className={`pill ${p.is_active === false ? 'danger' : 'ok'}`}>{p.is_active === false ? 'Pasif' : 'Aktif'}</span></td>
                  <td>
                    <div className="actions" style={{ marginTop: 0 }}>
                      <button className="soft" onClick={() => updateProfile(p, { is_active: p.is_active === false })}>{p.is_active === false ? 'Aktif Yap' : 'Pasif Yap'}</button>
                      <button className="amber" onClick={() => resetPasswordInfo(p)}>Şifre Bilgisi</button>
                    </div>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && <tr><td colSpan={5}>Kullanıcı yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
