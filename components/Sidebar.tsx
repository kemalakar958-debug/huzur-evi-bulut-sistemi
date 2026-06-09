'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Profile = {
  role: string | null;
  facility_id: string | null;
  full_name?: string | null;
};

type MenuItem = [string, string, string];

const patientManagement: MenuItem[] = [
  ['Hasta Listesi', '/patients', '👥'],
  ['Hasta Kabul / Ayrılış', '/admissions', '📥'],
  ['Ziyaretçi Takibi', '/visitors', '👪'],
];

const clinicalCare: MenuItem[] = [
  ['Vital Takip', '/vitals', '🩺'],
  ['Tedavi Sistemi', '/treatments', '🧪'],
  ['İlaçlar', '/medications', '💊'],
  ['Günlük Bakım', '/daily-care', '🛏️'],
  ['Beslenme / Sıvı', '/nutrition', '🍽️'],
  ['Bası / Pansuman', '/wound-care', '🩹'],
  ['Olay / Düşme', '/incidents', '⚠️'],
  ['Hastane Süreç Merkezi', '/hospital-cases', '🏥'],
  ['Randevular', '/appointments', '📅'],
];

const operations: MenuItem[] = [
  ['Revir Deposu', '/depot', '🏬'],
  ['Kurumlar Arası İstek', '/interfacility-requests', '🔁'],
  ['Evrak Merkezi', '/documents', '📁'],
  ['Emanet / Kıyafet', '/belongings', '🧳'],
  ['Görev Takibi', '/tasks', '📌'],
  ['Nöbet Teslim', '/shift-handover', '📘'],
];

const founderManagement: MenuItem[] = [
  ['Kurucu Dashboard', '/founder-dashboard', '👑'],
  ['Kurumlar / Ayarlar', '/facilities', '🏢'],
  ['Kullanıcı Oluştur / Yetki', '/user-admin', '🧑‍💼'],
  ['Rol / Kurum Ayarları', '/role-settings', '🧩'],
  ['Sistem Ayarları', '/system-settings', '⚙️'],
];

const managerManagement: MenuItem[] = [
  ['Kurum Panelim', '/my-panel', '🏢'],
];

function MenuGroup({ title, items }: { title: string; items: MenuItem[] }) {
  if (!items.length) return null;

  return (
    <div>
      <div className="navTitle">{title}</div>
      {items.map(([label, href, icon]) => (
        <Link className="navBtn" href={href} key={href}>
          <span>{icon}</span>
          <span>{label}</span>
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
          <span>{role} panel • v49 temiz menü</span>
        </div>
      </div>

      {isFounder && <MenuGroup title="🏢 Yönetim Merkezi" items={founderManagement} />}
      {isManager && <MenuGroup title="🏢 Müdür Merkezi" items={managerManagement} />}

      {(isFounder || isManager || isNurse || isViewer) && (
        <MenuGroup title="👥 Hasta Yönetimi" items={patientManagement} />
      )}

      {(isFounder || isManager || isNurse || isViewer) && (
        <MenuGroup title="🩺 Klinik ve Bakım" items={clinicalCare} />
      )}

      {(isFounder || isManager || isNurse) && (
        <MenuGroup title="📦 Operasyon Merkezi" items={operations} />
      )}
    </aside>
  );
}
