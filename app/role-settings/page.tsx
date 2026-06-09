'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import RoleGuard from '@/components/RoleGuard';
import { supabase } from '@/lib/supabaseClient';

type Facility = Record<string, any>;
type Profile = Record<string, any>;

export default function RoleSettingsPage() {
  return (
    <Shell>
      <RoleGuard allowedRoles={['founder']} title="Rol / Kurum Ayarları">
        <RoleSettingsContent />
      </RoleGuard>
    </Shell>
  );
}

function RoleSettingsContent() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: facilityRows } = await supabase.from('facilities').select('*').order('name');
    setFacilities(facilityRows || []);

    const { data: profileRows } = await supabase.from('profiles').select('*').order('full_name');
    setProfiles(profileRows || []);
  }

  async function updateProfile(profile: Profile, patch: Record<string, any>) {
    const next = { ...profile, ...patch };

    const { error } = await supabase
      .from('profiles')
      .update({
        role: next.role,
        facility_id: next.role === 'founder' ? null : next.facility_id,
        full_name: next.full_name || null,
      })
      .eq('id', profile.id);

    if (error) return alert(error.message);
    await load();
  }

  return (
    <>
      <div className="hero">
        <h2>Rol / Kurum Ayarları</h2>
        <p>Hangi kullanıcı hangi paneli görecek ve hangi kuruma bağlı çalışacak buradan ayarlanır.</p>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Kullanıcı Yetkileri</h2>
            <p>Founder tüm kurumları görür. Manager/Nurse/Viewer sadece atanmış kurumunu görür.</p>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Rol</th>
                <th>Kurum</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      value={p.full_name || ''}
                      onChange={(e) => setProfiles((old) => old.map((x) => x.id === p.id ? { ...x, full_name: e.target.value } : x))}
                      onBlur={() => updateProfile(p, { full_name: p.full_name })}
                    />
                    <small>{p.id}</small>
                  </td>
                  <td>
                    <select value={p.role || 'viewer'} onChange={(e) => updateProfile(p, { role: e.target.value })}>
                      <option value="founder">founder - Kurucu</option>
                      <option value="manager">manager - Müdür</option>
                      <option value="nurse">nurse - Hemşire</option>
                      <option value="viewer">viewer - Görüntüleyici</option>
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
                  <td>
                    {p.role === 'founder' && 'Tüm kurumlar + kurucu paneli'}
                    {p.role === 'manager' && 'Sadece atanmış kurum + müdür işlemleri'}
                    {p.role === 'nurse' && 'Sadece atanmış kurum + klinik işlemler'}
                    {p.role === 'viewer' && 'Sadece atanmış kurum + görüntüleme'}
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && <tr><td colSpan={4}>Kullanıcı profili yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
