'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { applyActiveFacilityFilter, useActiveFacility } from '@/lib/activeFacility';

type Row = Record<string, any>;

function last24Iso() { return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); }
function monthIso() { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.toISOString(); }
function fmtDate(value: any) { if (!value) return '-'; try { return new Date(value).toLocaleString('tr-TR'); } catch { return '-'; } }

export default function DashboardPage() {
  const ctx = useActiveFacility();
  const [facilities, setFacilities] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [incidents24, setIncidents24] = useState<Row[]>([]);
  const [treatments24, setTreatments24] = useState<Row[]>([]);
  const [tasksOpen, setTasksOpen] = useState<Row[]>([]);
  const [hospitalOpen, setHospitalOpen] = useState<Row[]>([]);
  const [criticalDepot, setCriticalDepot] = useState<Row[]>([]);
  const [admissionsMonth, setAdmissionsMonth] = useState<Row[]>([]);
  const [exitsMonth, setExitsMonth] = useState<Row[]>([]);

  useEffect(() => { load(); }, [ctx.activeFacilityId, ctx.role, ctx.userFacilityId]);

  async function queryRows(table: string, limit = 300, extra?: (query: any) => any) {
    try {
      let query = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(limit);
      query = applyActiveFacilityFilter(query, ctx);
      if (extra) query = extra(query);
      const { data } = await query;
      return data || [];
    } catch { return []; }
  }

  async function load() {
    const { data: facilityRows } = await supabase.from('facilities').select('*').order('name');
    setFacilities(facilityRows || []);

    const [patientRows, incidentRows, treatmentRows, taskRows, hospitalRows, depotRows, admissionRows, exitRows] = await Promise.all([
      queryRows('patients', 1000),
      queryRows('incident_records', 100, (query) => query.gte('created_at', last24Iso())),
      queryRows('treatment_records', 100, (query) => query.gte('created_at', last24Iso())),
      queryRows('care_tasks', 150, (query) => query.in('status', ['Aktif', 'Bekliyor'])),
      queryRows('hospital_cases', 150, (query) => query.not('status', 'in', '("Kuruma Döndü","İptal")')),
      queryRows('depot_items', 500),
      queryRows('admission_records', 100, (query) => query.gte('created_at', monthIso())),
      queryRows('exit_records', 100, (query) => query.gte('created_at', monthIso())),
    ]);

    setPatients(patientRows);
    setIncidents24(incidentRows);
    setTreatments24(treatmentRows);
    setTasksOpen(taskRows);
    setHospitalOpen(hospitalRows);
    setCriticalDepot(depotRows.filter((row: Row) => Number(row.current_stock || 0) <= Number(row.min_stock || 0)));
    setAdmissionsMonth(admissionRows);
    setExitsMonth(exitRows);
  }

  function activeFacilityName() {
    if (ctx.role === 'founder' && ctx.activeFacilityId === 'general') return 'Genel Kontrol';
    const targetId = ctx.role === 'founder' ? ctx.activeFacilityId : ctx.userFacilityId;
    return facilities.find((facility) => facility.id === targetId)?.name || 'Kurum';
  }

  const hospitalPatients = patients.filter((patient) => patient.status === 'Hastanede');
  const leavePatients = patients.filter((patient) => patient.status === 'İzinli');
  const activePatients = patients.filter((patient) => (patient.status || 'Aktif') === 'Aktif');

  return (
    <Shell>
      <div className="simpleHero"><div><h2>Ana Sayfa</h2><p>{activeFacilityName()} operasyon özeti.</p></div></div>
      <div className="simpleStats">
        <Stat title="Toplam Hasta" value={patients.length} />
        <Stat title="Hastanede" value={hospitalPatients.length} />
        <Stat title="İzinli" value={leavePatients.length} />
        <Stat title="Son 24s Olay" value={incidents24.length} />
        <Stat title="Bekleyen Görev" value={tasksOpen.length} />
        <Stat title="Kritik Stok" value={criticalDepot.length} />
      </div>
      <div className="grid grid2">
        <SimplePanel title="Son Olaylar" href="/incidents"><SimpleList rows={incidents24.slice(0, 8)} titleField="incident_type" subField="patient_name" dateField="incident_at" empty="Son 24 saatte olay yok." /></SimplePanel>
        <SimplePanel title="Son Tedaviler" href="/treatments"><SimpleList rows={treatments24.slice(0, 8)} titleField="treatment_name" subField="patient_name" dateField="created_at" empty="Son 24 saatte tedavi yok." /></SimplePanel>
      </div>
      <div className="grid grid3">
        <SimplePanel title="Hastanedekiler" href="/hospital-cases"><MiniList rows={hospitalOpen.slice(0, 6)} primary="patient_name" secondary="hospital_name" empty="Açık hastane süreci yok." /></SimplePanel>
        <SimplePanel title="Kritik Stok" href="/depot"><MiniList rows={criticalDepot.slice(0, 6)} primary="name" secondary="category" empty="Kritik stok yok." /></SimplePanel>
        <SimplePanel title="Bu Ay" href="/admissions"><div className="simpleMonth"><div><span>Giriş</span><strong>{admissionsMonth.length}</strong></div><div><span>Çıkış</span><strong>{exitsMonth.length}</strong></div><div><span>Aktif</span><strong>{activePatients.length}</strong></div></div></SimplePanel>
      </div>
    </Shell>
  );
}

function Stat({ title, value }: { title: string; value: number }) { return <div className="simpleStat"><span>{title}</span><strong>{value}</strong></div>; }
function SimplePanel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) { return <div className="simplePanel"><div className="simplePanelHead"><h3>{title}</h3><Link href={href}>Tümü</Link></div>{children}</div>; }
function SimpleList({ rows, titleField, subField, dateField, empty }: { rows: Row[]; titleField: string; subField: string; dateField: string; empty: string }) {
  if (!rows.length) return <div className="simpleEmpty">{empty}</div>;
  return <div className="simpleList">{rows.map((row) => <div className="simpleListRow" key={row.id}><div><strong>{row[titleField] || '-'}</strong><span>{row[subField] || '-'}</span></div><small>{fmtDate(row[dateField] || row.created_at)}</small></div>)}</div>;
}
function MiniList({ rows, primary, secondary, empty }: { rows: Row[]; primary: string; secondary: string; empty: string }) {
  if (!rows.length) return <div className="simpleEmpty">{empty}</div>;
  return <div className="simpleList">{rows.map((row) => <div className="simpleListRow" key={row.id}><div><strong>{row[primary] || '-'}</strong><span>{row[secondary] || '-'}</span></div></div>)}</div>;
}
