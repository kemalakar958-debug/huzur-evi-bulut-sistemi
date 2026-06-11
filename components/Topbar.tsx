'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { setStoredActiveFacilityId } from '@/lib/activeFacility';

type Profile = { role: string | null; facility_id: string | null; full_name?: string | null };
type Facility = { id: string; name: string };

export default function Topbar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeFacilityId, setActiveFacilityId] = useState('general');
  const [email, setEmail] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    setEmail(user.email || '');

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('role, facility_id, full_name')
      .eq('id', user.id)
      .maybeSingle();

    setProfile(profileRow || null);

    const { data: facilityRows } = await supabase
      .from('facilities')
      .select('id, name')
      .order('name');

    setFacilities(facilityRows || []);

    const saved = typeof window !== 'undefined' ? localStorage.getItem('activeFacilityId') : null;

    if (profileRow?.role === 'founder') {
      setActiveFacilityId(saved || 'general');
    } else if (profileRow?.facility_id) {
      setActiveFacilityId(profileRow.facility_id);
      setStoredActiveFacilityId(profileRow.facility_id);
    }
  }

  function roleLabel() {
    if (profile?.role === 'founder') return 'Kurucu';
    if (profile?.role === 'manager') return 'Müdür';
    if (profile?.role === 'nurse') return 'Hemşire';
    if (profile?.role === 'viewer') return 'Görüntüleyici';
    return 'Rol Yok';
  }

  function activeFacilityName() {
    if (!profile) return 'Yükleniyor...';
    if (profile.role === 'founder') {
      if (activeFacilityId === 'general') return 'Genel Kontrol';
      return facilities.find((f) => f.id === activeFacilityId)?.name || 'Genel Kontrol';
    }
    return facilities.find((f) => f.id === profile.facility_id)?.name || 'Kurum Atanmamış';
  }

  function changeFounderFacility(value: string) {
    setActiveFacilityId(value);
    setStoredActiveFacilityId(value);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <>
      <header className="v50Topbar">
        <div className="v50Box">
          <span>AKTİF KURUM</span>
          <strong>{activeFacilityName()}</strong>
        </div>

        {profile?.role === 'founder' && (
          <select className="v50Select" value={activeFacilityId} onChange={(e) => changeFounderFacility(e.target.value)}>
            <option value="general">Genel Kontrol</option>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}

        <div className="v50Box">
          <strong>{profile?.full_name || email || 'Kullanıcı'}</strong>
          <span>{roleLabel()} • {email}</span>
        </div>

        <button className="v50Logout" onClick={logout}>Çıkış</button>
      </header>

      <style jsx global>{`
        .v50Topbar{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;background:#fff!important;border:1px solid #e5e7eb!important;border-radius:18px!important;padding:14px!important;margin-bottom:18px!important;box-shadow:0 10px 25px rgba(15,23,42,.06)!important}
        .v50Box{background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:14px!important;padding:10px 14px!important;min-width:220px!important;display:block!important}
        .v50Box span{display:block!important;color:#64748b!important;font-size:12px!important;font-weight:800!important;line-height:1.3!important}
        .v50Box strong{display:block!important;color:#0f172a!important;font-size:16px!important;font-weight:900!important;line-height:1.3!important;margin-top:3px!important}
        .v50Select{height:44px!important;min-width:200px!important;border-radius:14px!important;border:1px solid #cbd5e1!important;background:white!important;padding:0 12px!important;font-weight:800!important;color:#0f172a!important}
        .v50Logout{height:44px!important;border:none!important;border-radius:14px!important;padding:0 18px!important;background:#eef2ff!important;color:#1d4ed8!important;font-weight:900!important;cursor:pointer!important;white-space:nowrap!important}
        @media(max-width:900px){.v50Topbar{flex-direction:column!important;align-items:stretch!important}.v50Box,.v50Select,.v50Logout{width:100%!important}}
      `}</style>
    </>
  );
}
