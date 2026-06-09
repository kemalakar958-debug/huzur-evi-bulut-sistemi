'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import RoleGuard from '@/components/RoleGuard';
import { supabase } from '@/lib/supabaseClient';

type Profile = Record<string, any>;
type Facility = Record<string, any>;

export default function MyPanelPage() {
  return (
    <Shell>
      <RoleGuard allowedRoles={['manager', 'nurse', 'viewer']} title="Kurum Panelim">
        <MyPanelContent />
      </RoleGuard>
    </Shell>
  );
}

function MyPanelContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => { load(); }, []);

  async function count(table: string, facilityId: string) {
    try {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facilityId);
      return count || 0;
    } catch {
      return 0;
    }
  }

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    setProfile(p || null);

    if (!p?.facility_id) return;

    const { data: f } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', p.facility_id)
      .maybeSingle();

    setFacility(f || null);

    const [patients, meds, treatments, incidents, tasks, docs, depot, belongings] = await Promise.all([
      count('patients', p.facility_id),
      count('medications', p.facility_id),
      count('treatment_records', p.facility_id),
      count('incident_records', p.facility_id),
      count('care_tasks', p.facility_id),
      count('documents', p.facility_id),
      count('depot_items', p.facility_id),
      count('belonging_records', p.facility_id),
    ]);

    setStats({ patients, meds, treatments, incidents, tasks, docs, depot, belongings });
  }

  return (
    <>
      <div className="hero">
        <h2>Kurum Panelim</h2>
        <p>Müdür, hemşire ve görüntüleyici kullanıcılar sadece atanmış olduğu kurumu görür.</p>
      </div>

      <div className="panel">
        <h2>{facility?.name || 'Kurum atanmadı'}</h2>
        <p><b>Rol:</b> {profile?.role || '-'} • <b>Kullanıcı:</b> {profile?.full_name || '-'}</p>
        <p><b>Müdür:</b> {facility?.manager_name || '-'} • <b>Sorumlu Hemşire:</b> {facility?.nurse_responsible || '-'}</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Hasta</span><strong>{stats.patients || 0}</strong></div>
        <div className="kpi"><span>İlaç</span><strong>{stats.meds || 0}</strong></div>
        <div className="kpi"><span>Tedavi</span><strong>{stats.treatments || 0}</strong></div>
        <div className="kpi"><span>Olay</span><strong>{stats.incidents || 0}</strong></div>
        <div className="kpi"><span>Görev</span><strong>{stats.tasks || 0}</strong></div>
        <div className="kpi"><span>Evrak</span><strong>{stats.docs || 0}</strong></div>
        <div className="kpi"><span>Depo</span><strong>{stats.depot || 0}</strong></div>
        <div className="kpi"><span>Emanet</span><strong>{stats.belongings || 0}</strong></div>
      </div>
    </>
  );
}
