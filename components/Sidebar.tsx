'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Profile = {
  role: string | null;
  facility_id: string | null;
  full_name?: string | null;
};

const founderMenu = [
  ['Kurucu Dashboard Pro', '/founder-dashboard', '👑'],
  ['Yönetim Paneli', '/management', '📊'],
  ['Kurumlar / Ayarlar', '/facilities', '🏢'],
  ['Rol / Kurum Ayarları', '/role-settings', '🧩'],
  ['Kurumlar Arası İstek', '/interfacility-requests', '🔁'],
  ['Kullanıcılar', '/users', '🔐'],
];

const managerMenu = [
  ['Kurum Panelim', '/my-panel', '🏢'],
  ['Hasta Listesi', '/patients', '👥'],
  ['Hasta Kabul / Ayrılış', '/admissions', '📥'],
  ['Tedavi Sistemi', '/treatments', '🧪'],
  ['İlaçlar', '/medications', '💊'],
  ['Revir Deposu', '/depot', '🏬'],
  ['Kurumlar Arası İstek', '/interfacility-requests', '🔁'],
];

const clinicalMenu = [
  ['Hasta Listesi', '/patients', '👥'],
  ['Vital Takip', '/vitals', '🩺'],
  ['Tedavi Sistemi', '/treatments', '🧪'],
  ['Günlük Bakım', '/daily-care', '🛏️'],
  ['Beslenme / Sıvı', '/nutrition', '🍽️'],
  ['Bası / Pansuman', '/wound-care', '🩹'],
  ['Olay / Düşme', '/incidents', '⚠️'],
  ['Hastane Sevk', '/transfers', '🚑'],
  ['Görev Takip', '/tasks', '📌'],
  ['Nöbet Teslim', '/shift-handover', '📘'],
];

const operationMenu = [
  ['Emanet / Kıyafet', '/belongings', '🧳'],
  ['Evrak Merkezi', '/documents', '📁'],
  ['Randevular', '/appointments', '📅'],
  ['Aktivite Takibi', '/activities', '🎲'],
  ['Fizik Tedavi', '/physio', '🚶'],
  ['Uyku Takibi', '/sleep', '🌙'],
  ['Davranış Takibi', '/behavior', '🧠'],
  ['Ziyaretçi Takibi', '/visitors', '👪'],
  ['Risk Skorları', '/risk-scores', '📊'],
];

function MenuGroup({ title, items }: { title: string; items: string[][] }) {
  if (!items.length) return null;

  return (
    <div>
      <div className="navTitle">{title}</div>
      {items.map(([label, href, icon]) => (
        <Link className="navBtn" href={href} key={href}>
          <span>{icon}</span><span>{label}</span>
        </Link>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) return;

    const { data } = await supabase
      .from('profiles')
      .select('role, facility_id, full_name')
      .eq('id', userId)
      .maybeSingle();

    setProfile(data || null);
  }

  const role = profile?.role || 'viewer';
  const isFounder = role === 'founder';
  const isManager = role === 'manager';
  const isNurse = role === 'nurse';
  const isViewer = role === 'viewer';

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logoIcon">🏥</div>
        <div>
          <h1>İlgi Klinik Bulut</h1>
          <span>{role} panel</span>
        </div>
      </div>

      {isFounder && <MenuGroup title="Kurucu Merkezi" items={founderMenu} />}
      {isManager && <MenuGroup title="Müdür Paneli" items={managerMenu} />}

      {(isFounder || isManager || isNurse || isViewer) && (
        <MenuGroup title="Klinik İşlemler" items={clinicalMenu} />
      )}

      {(isFounder || isManager || isNurse) && (
        <MenuGroup title="Operasyon" items={operationMenu} />
      )}
    </aside>
  );
}
