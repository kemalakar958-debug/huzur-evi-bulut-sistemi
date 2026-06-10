'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { setStoredActiveFacilityId } from '@/lib/activeFacility';

type Profile = {
  role: string | null;
  facility_id: string | null;
  full_name?: string | null;
};

type Facility = {
  id: string;
  name: string;
};

export default function Topbar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeFacilityId, setActiveFacilityId] = useState('general');
  const [email, setEmail] = useState('');

  useEffect(() => {
    load();
  }, []);

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

  function activeFacilityName() {
    if (!profile) return 'Yükleniyor...';

    if (profile.role === 'founder') {
      if (activeFacilityId === 'general') return 'Genel Kontrol';
      return facilities.find((facility) => facility.id === activeFacilityId)?.name || 'Genel Kontrol';
    }

    return facilities.find((facility) => facility.id === profile.facility_id)?.name || 'Kurum Atanmamış';
  }

  function roleLabel() {
    if (profile?.role === 'founder') return 'Kurucu';
    if (profile?.role === 'manager') return 'Müdür';
    if (profile?.role === 'nurse') return 'Hemşire';
    if (profile?.role === 'viewer') return 'Görüntüleyici';
    return 'Rol Yok';
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
    <header className="topbar cleanTopbar">
      <div className="topbarLeft">
        <div className="activeFacilityBox">
          <span>AKTİF KURUM</span>
          <strong>{activeFacilityName()}</strong>
        </div>

        {profile?.role === 'founder' && (
          <select
            className="facilitySwitcher"
            value={activeFacilityId}
            onChange={(event) => changeFounderFacility(event.target.value)}
          >
            <option value="general">Genel Kontrol</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="topbarRight">
        <div className="userProfileBox">
          <div className="userAvatar">
            {(profile?.full_name || email || '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{profile?.full_name || email || 'Kullanıcı'}</strong>
            <span>{roleLabel()} • Çevrimiçi</span>
          </div>
        </div>

        <button className="logoutBtn" onClick={logout}>
          Çıkış
        </button>
      </div>
    </header>
  );
}
