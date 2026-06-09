'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Facility = Record<string, any>;

type FacilityStats = {
  patients: number;
  meds: number;
  treatments: number;
  incidents: number;
  transfers: number;
  tasks: number;
  docs: number;
  depot: number;
  belongings: number;
};

export default function ManagementPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [stats, setStats] = useState<Record<string, FacilityStats>>({});
  const [selectedFacility, setSelectedFacility] = useState<string>('all');

  useEffect(() => {
    load();
  }, []);

  async function countByFacility(table: string, facilityId: string) {
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
    const { data: facilityRows } = await supabase.from('facilities').select('*').order('name');
    const list = facilityRows || [];
    setFacilities(list);

    const next: Record<string, FacilityStats> = {};

    for (const f of list) {
      const [
        patients,
        meds,
        treatments,
        incidents,
        transfers,
        tasks,
        docs,
        depot,
        belongings,
      ] = await Promise.all([
        countByFacility('patients', f.id),
        countByFacility('medications', f.id),
        countByFacility('treatment_records', f.id),
        countByFacility('incident_records', f.id),
        countByFacility('hospital_transfers', f.id),
        countByFacility('care_tasks', f.id),
        countByFacility('documents', f.id),
        countByFacility('depot_items', f.id),
        countByFacility('belonging_records', f.id),
      ]);

      next[f.id] = {
        patients,
        meds,
        treatments,
        incidents,
        transfers,
        tasks,
        docs,
        depot,
        belongings,
      };
    }

    setStats(next);
  }

  const visibleFacilities = selectedFacility === 'all'
    ? facilities
    : facilities.filter((f) => f.id === selectedFacility);

  const totals = visibleFacilities.reduce((acc, f) => {
    const s = stats[f.id] || {
      patients: 0,
      meds: 0,
      treatments: 0,
      incidents: 0,
      transfers: 0,
      tasks: 0,
      docs: 0,
      depot: 0,
      belongings: 0,
    };

    Object.keys(s).forEach((key) => {
      acc[key] = Number(acc[key] || 0) + Number((s as any)[key] || 0);
    });

    return acc;
  }, {} as Record<string, number>);

  return (
    <Shell>
      <div className="hero">
        <h2>Yönetim Paneli</h2>
        <p>Kurucu ve müdür için tüm kurumlara erişim, kurum bazlı operasyon özeti ve hızlı kontrol ekranı.</p>
      </div>

      <div className="panel">
        <div className="grid grid2">
          <div>
            <label>Kurum Filtresi</label>
            <select value={selectedFacility} onChange={(e) => setSelectedFacility(e.target.value)}>
              <option value="all">Tüm Kurumlar</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="notice">Bu ekran kurucu/müdür için tüm kurumları tek merkezden görmeye yarar.</div>
        </div>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Kurum</span><strong>{visibleFacilities.length}</strong></div>
        <div className="kpi"><span>Hasta</span><strong>{totals.patients || 0}</strong></div>
        <div className="kpi"><span>İlaç</span><strong>{totals.meds || 0}</strong></div>
        <div className="kpi"><span>Tedavi</span><strong>{totals.treatments || 0}</strong></div>
        <div className="kpi"><span>Olay</span><strong>{totals.incidents || 0}</strong></div>
        <div className="kpi"><span>Sevk</span><strong>{totals.transfers || 0}</strong></div>
        <div className="kpi"><span>Görev</span><strong>{totals.tasks || 0}</strong></div>
        <div className="kpi"><span>Evrak</span><strong>{totals.docs || 0}</strong></div>
        <div className="kpi"><span>Depo</span><strong>{totals.depot || 0}</strong></div>
        <div className="kpi"><span>Emanet</span><strong>{totals.belongings || 0}</strong></div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Kurum Bazlı Yönetim Özeti</h2>
            <p>Her kurumun ana sayıları ve kritik operasyon durumu.</p>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Kurum</th>
                <th>Durum</th>
                <th>Kapasite</th>
                <th>Hasta</th>
                <th>İlaç</th>
                <th>Tedavi</th>
                <th>Olay</th>
                <th>Sevk</th>
                <th>Görev</th>
                <th>Evrak</th>
                <th>Depo</th>
                <th>Emanet</th>
              </tr>
            </thead>
            <tbody>
              {visibleFacilities.map((facility) => {
                const s = stats[facility.id] || {};
                return (
                  <tr key={facility.id}>
                    <td><b>{facility.name}</b><br /><small>{facility.manager_name || '-'} • {facility.phone || '-'}</small></td>
                    <td><span className={`pill ${facility.status === 'Aktif' ? 'ok' : facility.status === 'Pasif' ? 'danger' : 'warn'}`}>{facility.status || 'Aktif'}</span></td>
                    <td>{facility.capacity || '-'}</td>
                    <td>{s.patients || 0}</td>
                    <td>{s.meds || 0}</td>
                    <td>{s.treatments || 0}</td>
                    <td>{s.incidents || 0}</td>
                    <td>{s.transfers || 0}</td>
                    <td>{s.tasks || 0}</td>
                    <td>{s.docs || 0}</td>
                    <td>{s.depot || 0}</td>
                    <td>{s.belongings || 0}</td>
                  </tr>
                );
              })}
              {visibleFacilities.length === 0 && <tr><td colSpan={12}>Kurum yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
