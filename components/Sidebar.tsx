'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Profile = { role: string | null; facility_id: string | null; full_name?: string | null };
type MenuItem = [string, string, string];
type MenuGroupData = { key: string; title: string; items: MenuItem[] };

const homeMenu: MenuItem[] = [['Ana Sayfa', '/dashboard', '🏠']];
const founderMenu: MenuItem[] = [
  ['Kurucu Dashboard', '/founder-dashboard', '👑'],
  ['Kurumlar / Ayarlar', '/facilities', '🏢'],
  ['Kullanıcı Oluştur / Yetki', '/user-admin', '🧑‍💼'],
  ['Rol / Kurum Ayarları', '/role-settings', '🧩'],
  ['Sistem Ayarları', '/system-settings', '⚙️'],
];
const managerMenu: MenuItem[] = [
  ['Kurum Panelim', '/my-panel', '🏢'],
  ['Kullanıcı Oluştur / Yetki', '/user-admin', '🧑‍💼'],
];
const patientMenu: MenuItem[] = [
  ['Hasta Listesi', '/patients', '👥'],
  ['Hasta Kabul / Ayrılış', '/admissions', '📥'],
  ['Ziyaretçi Takibi', '/visitors', '👪'],
];
const clinicalMenu: MenuItem[] = [
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
const nurseOperationsMenu: MenuItem[] = [
  ['Hatırlatıcı Merkezi', '/reminders', '⏰'],
  ['Nöbet Teslim', '/shift-handover', '📘'],
];
const managerOperationsMenu: MenuItem[] = [
  ['Hatırlatıcı Merkezi', '/reminders', '⏰'],
  ['Revir Deposu', '/depot', '🏬'],
  ['Kurumlar Arası İstek', '/interfacility-requests', '🔁'],
  ['Evrak Merkezi', '/documents', '📁'],
  ['Emanet / Kıyafet', '/belongings', '🧳'],
  ['Görev Takibi', '/tasks', '📌'],
  ['Nöbet Teslim', '/shift-handover', '📘'],
];

function MenuGroup({ group }: { group: MenuGroupData }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(`menu_${group.key}`);
    if (saved === 'closed') setOpen(false);
  }, [group.key]);

  function toggle() {
    const next = !open;
    setOpen(next);
    localStorage.setItem(`menu_${group.key}`, next ? 'open' : 'closed');
  }

  return (
    <div className="collapsibleMenuGroup">
      <button className="navTitle navTitleButton" onClick={toggle} type="button">
        <span>{group.title}</span><b>{open ? '−' : '+'}</b>
      </button>
      {open && <div className="navGroupItems">
        {group.items.map(([label, href, icon]) => (
          <Link className="navBtn" href={href} key={href}><span>{icon}</span><span>{label}</span></Link>
        ))}
      </div>}
    </div>
  );
}

export default function Sidebar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    const { data } = await supabase.from('profiles').select('role, facility_id, full_name').eq('id', userId).maybeSingle();
    setProfile(data || null);
  }

  const role = profile?.role || '';
  const isFounder = role === 'founder';
  const isManager = role === 'manager';
  const isNurse = role === 'nurse';
  const groups: MenuGroupData[] = [];

  if (isFounder || isManager || isNurse) groups.push({ key: 'home', title: '🏠 Ana Sayfa', items: homeMenu });
  if (isFounder) groups.push({ key: 'founder', title: '🏢 Yönetim Merkezi', items: founderMenu });
  if (isManager) groups.push({ key: 'manager', title: '🏢 Müdür Merkezi', items: managerMenu });
  if (isFounder || isManager || isNurse) {
    groups.push({ key: 'patients', title: '👥 Hasta Yönetimi', items: patientMenu });
    groups.push({ key: 'clinical', title: '🩺 Klinik ve Bakım', items: clinicalMenu });
  }
  if (isFounder || isManager) groups.push({ key: 'operations', title: '📦 Operasyon Merkezi', items: managerOperationsMenu });
  if (isNurse) groups.push({ key: 'nurse_operations', title: '📦 Günlük İşler', items: nurseOperationsMenu });

  return (
    <>
      <aside className="sidebar">
        <div className="logo"><div className="logoIcon">🏥</div><div><h1>İlgi Klinik Bulut</h1><span>{role || 'yetkisiz'} panel</span></div></div>
        {groups.map((group) => <MenuGroup group={group} key={group.key} />)}
      </aside>
      <style jsx global>{`
        .navTitleButton{width:100%!important;border:none!important;background:transparent!important;display:flex!important;align-items:center!important;justify-content:space-between!important;cursor:pointer!important;padding-right:8px!important}
        .navTitleButton b{font-size:18px!important;line-height:1!important;opacity:.75!important}
        .navGroupItems{display:flex!important;flex-direction:column!important;gap:6px!important}
        .collapsibleMenuGroup{margin-bottom:10px!important}
      `}</style>
    </>
  );
}
