'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { applyActiveFacilityFilter, useActiveFacility } from '@/lib/activeFacility';

type Row = Record<string, any>;

function last24Iso() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

function monthIso() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fmtDate(value: any) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('tr-TR');
  } catch {
    return '-';
  }
}

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

  useEffect(() => {
    load();
  }, [ctx.activeFacilityId, ctx.role, ctx.userFacilityId]);

  async function queryRows(table: string, limit = 300, extra?: (q: any) => any) {
    try {
      let q = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(limit);
      q = applyActiveFacilityFilter(q, ctx);
      if (extra) q = extra(q);
      const { data } = await q;
      return data || [];
    } catch {
      return [];
    }
  }

  async function load() {
    const { data: facilityRows } = await supabase.from('facilities').select('*').order('name');
    setFacilities(facilityRows || []);

    const [
      patientRows,
      incidentRows,
      treatmentRows,
      taskRows,
      hospitalRows,
      depotRows,
      admissionRows,
      exitRows,
    ] = await Promise.all([
      queryRows('patients', 1000),
      queryRows('incident_records', 100, (q) => q.gte('created_at', last24Iso())),
      queryRows('treatment_records', 100, (q) => q.gte('created_at', last24Iso())),
      queryRows('care_tasks', 150, (q) => q.in('status', ['Aktif', 'Bekliyor'])),
      queryRows('hospital_cases', 150, (q) => q.not('status', 'in', '("Kuruma Döndü","İptal")')),
      queryRows('depot_items', 500),
      queryRows('admission_records', 100, (q) => q.gte('created_at', monthIso())),
      queryRows('exit_records', 100, (q) => q.gte('created_at', monthIso())),
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

  const activePatients = patients.filter((p) => (p.status || 'Aktif') === 'Aktif');
  const hospitalPatients = patients.filter((p) => p.status === 'Hastanede');
  const leavePatients = patients.filter((p) => p.status === 'İzinli');
  const deceasedPatients = patients.filter((p) => p.status === 'Vefat');

  return (
    <Shell>
      <div className="hero">
        <h2>Ana Sayfa</h2>
        <p>{activeFacilityName()} için son 24 saat operasyon özeti.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Toplam Hasta</span><strong>{patients.length}</strong></div>
        <div className="kpi"><span>Aktif Hasta</span><strong>{activePatients.length}</strong></div>
        <div className="kpi"><span>Hastanede</span><strong>{hospitalPatients.length}</strong></div>
        <div className="kpi"><span>İzinli</span><strong>{leavePatients.length}</strong></div>
        <div className="kpi"><span>Vefat</span><strong>{deceasedPatients.length}</strong></div>
        <div className="kpi"><span>24s Olay</span><strong>{incidents24.length}</strong></div>
        <div className="kpi"><span>24s Tedavi</span><strong>{treatments24.length}</strong></div>
        <div className="kpi"><span>Bekleyen Görev</span><strong>{tasksOpen.length}</strong></div>
        <div className="kpi"><span>Açık Hastane</span><strong>{hospitalOpen.length}</strong></div>
        <div className="kpi"><span>Kritik Depo</span><strong>{criticalDepot.length}</strong></div>
        <div className="kpi"><span>Bu Ay Giriş</span><strong>{admissionsMonth.length}</strong></div>
        <div className="kpi"><span>Bu Ay Çıkış</span><strong>{exitsMonth.length}</strong></div>
      </div>

      <div className="grid grid2">
        <Panel title="Son 24 Saat Olay Döngüsü" href="/incidents">
          <Timeline rows={incidents24.slice(0, 8)} titleField="incident_type" subField="patient_name" dateField="incident_at" empty="Son 24 saatte olay yok." />
        </Panel>

        <Panel title="Son 24 Saat Tedavi Döngüsü" href="/treatments">
          <Timeline rows={treatments24.slice(0, 8)} titleField="treatment_name" subField="patient_name" dateField="created_at" empty="Son 24 saatte tedavi yok." />
        </Panel>
      </div>

      <div className="grid grid3">
        <Panel title="Hastanedeki Hastalar" href="/hospital-cases">
          <MiniList rows={hospitalOpen.slice(0, 8)} primary="patient_name" secondary="hospital_name" badge="status" empty="Açık hastane süreci yok." />
        </Panel>

        <Panel title="Bekleyen Görevler" href="/tasks">
          <MiniList rows={tasksOpen.slice(0, 8)} primary="title" secondary="patient_name" badge="status" empty="Bekleyen görev yok." />
        </Panel>

        <Panel title="Kritik Depo" href="/depot">
          <MiniList rows={criticalDepot.slice(0, 8)} primary="name" secondary="category" badge="current_stock" empty="Kritik depo ürünü yok." />
        </Panel>
      </div>
    </Shell>
  );
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <div className="panelHead">
        <div>
          <h2>{title}</h2>
          <p>Aktif kuruma göre filtrelenir.</p>
        </div>
        <Link className="btn soft" href={href}>Tümü</Link>
      </div>
      {children}
    </div>
  );
}

function Timeline({ rows, titleField, subField, dateField, empty }: { rows: Row[]; titleField: string; subField: string; dateField: string; empty: string }) {
  if (!rows.length) return <div className="notice">{empty}</div>;

  return (
    <div className="timelineList">
      {rows.map((row) => (
        <div className="timelineItem" key={row.id}>
          <div className="timelineDot" />
          <div>
            <b>{row[titleField] || '-'}</b>
            <p>{row[subField] || '-'} • {fmtDate(row[dateField] || row.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniList({ rows, primary, secondary, badge, empty }: { rows: Row[]; primary: string; secondary: string; badge: string; empty: string }) {
  if (!rows.length) return <div className="notice">{empty}</div>;

  return (
    <div className="miniList">
      {rows.map((row) => (
        <div className="miniRow" key={row.id}>
          <div>
            <b>{row[primary] || '-'}</b>
            <span>{row[secondary] || '-'}</span>
          </div>
          <span className="pill warn">{row[badge] || '-'}</span>
        </div>
      ))}
    </div>
  );
}
