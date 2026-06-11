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
    return facilities.find((f) => f.id === targetId)?.name || 'Kurum';
  }

  const hospitalPatients = patients.filter((p) => p.status === 'Hastanede');
  const leavePatients = patients.filter((p) => p.status === 'İzinli');
  const activePatients = patients.filter((p) => (p.status || 'Aktif') === 'Aktif');

  return (
    <>
      <Shell>
        <div className="v50Hero">
          <h2>Ana Sayfa</h2>
          <p>{activeFacilityName()} operasyon özeti.</p>
        </div>

        <div className="v50Stats">
          <Stat title="Toplam Hasta" value={patients.length} />
          <Stat title="Hastanede" value={hospitalPatients.length} />
          <Stat title="İzinli" value={leavePatients.length} />
          <Stat title="Son 24s Olay" value={incidents24.length} />
          <Stat title="Bekleyen Görev" value={tasksOpen.length} />
          <Stat title="Kritik Stok" value={criticalDepot.length} />
        </div>

        <div className="v50Grid2">
          <Panel title="Son Olaylar" href="/incidents">
            <List rows={incidents24.slice(0, 8)} titleField="incident_type" subField="patient_name" dateField="incident_at" empty="Son 24 saatte olay yok." />
          </Panel>
          <Panel title="Son Tedaviler" href="/treatments">
            <List rows={treatments24.slice(0, 8)} titleField="treatment_name" subField="patient_name" dateField="created_at" empty="Son 24 saatte tedavi yok." />
          </Panel>
        </div>

        <div className="v50Grid3">
          <Panel title="Hastanedekiler" href="/hospital-cases">
            <Mini rows={hospitalOpen.slice(0, 6)} primary="patient_name" secondary="hospital_name" empty="Açık hastane süreci yok." />
          </Panel>
          <Panel title="Kritik Stok" href="/depot">
            <Mini rows={criticalDepot.slice(0, 6)} primary="name" secondary="category" empty="Kritik stok yok." />
          </Panel>
          <Panel title="Bu Ay" href="/admissions">
            <div className="v50Month"><div><span>Giriş</span><strong>{admissionsMonth.length}</strong></div><div><span>Çıkış</span><strong>{exitsMonth.length}</strong></div><div><span>Aktif</span><strong>{activePatients.length}</strong></div></div>
          </Panel>
        </div>
      </Shell>

      <style jsx global>{`
        .v50Hero{background:#fff!important;border:1px solid #e5e7eb!important;border-radius:18px!important;padding:18px!important;margin-bottom:16px!important}
        .v50Hero h2{margin:0!important;color:#0f172a!important;font-size:28px!important;font-weight:900!important}
        .v50Hero p{margin:6px 0 0!important;color:#64748b!important;font-size:15px!important}
        .v50Stats{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:12px!important;margin-bottom:16px!important}
        .v50Stat{background:#fff!important;border:1px solid #e5e7eb!important;border-radius:16px!important;padding:16px!important;box-shadow:0 8px 18px rgba(15,23,42,.04)!important}
        .v50Stat span{display:block!important;color:#64748b!important;font-size:13px!important;font-weight:800!important}
        .v50Stat strong{display:block!important;color:#0f172a!important;font-size:32px!important;font-weight:900!important;margin-top:8px!important}
        .v50Grid2{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important;margin-bottom:16px!important}
        .v50Grid3{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:16px!important;margin-bottom:16px!important}
        .v50Panel{background:#fff!important;border:1px solid #e5e7eb!important;border-radius:18px!important;padding:16px!important;min-height:150px!important}
        .v50PanelHead{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin-bottom:12px!important}
        .v50PanelHead h3{margin:0!important;color:#0f172a!important;font-size:18px!important;font-weight:900!important}
        .v50PanelHead a{color:#2563eb!important;font-size:13px!important;font-weight:900!important;text-decoration:none!important}
        .v50List{display:flex!important;flex-direction:column!important;gap:10px!important}
        .v50Row{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important;border-top:1px solid #f1f5f9!important;padding-top:10px!important}
        .v50Row:first-child{border-top:none!important;padding-top:0!important}
        .v50Row strong{display:block!important;color:#0f172a!important;font-size:14px!important;font-weight:900!important}
        .v50Row span,.v50Row small{display:block!important;color:#64748b!important;font-size:13px!important;margin-top:3px!important}
        .v50Empty{background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:14px!important;padding:12px!important;color:#64748b!important;font-weight:700!important}
        .v50Month{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}
        .v50Month div{background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:14px!important;padding:12px!important}
        .v50Month span{display:block!important;color:#64748b!important;font-size:12px!important;font-weight:900!important}
        .v50Month strong{display:block!important;color:#0f172a!important;font-size:26px!important;font-weight:900!important;margin-top:6px!important}
        @media(max-width:1100px){.v50Stats{grid-template-columns:repeat(3,minmax(0,1fr))!important}.v50Grid3{grid-template-columns:1fr!important}}
        @media(max-width:800px){.v50Stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}.v50Grid2{grid-template-columns:1fr!important}}
      `}</style>
    </>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return <div className="v50Stat"><span>{title}</span><strong>{value}</strong></div>;
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return <div className="v50Panel"><div className="v50PanelHead"><h3>{title}</h3><Link href={href}>Tümü</Link></div>{children}</div>;
}

function List({ rows, titleField, subField, dateField, empty }: { rows: Row[]; titleField: string; subField: string; dateField: string; empty: string }) {
  if (!rows.length) return <div className="v50Empty">{empty}</div>;
  return <div className="v50List">{rows.map((row) => <div className="v50Row" key={row.id}><div><strong>{row[titleField] || '-'}</strong><span>{row[subField] || '-'}</span></div><small>{fmtDate(row[dateField] || row.created_at)}</small></div>)}</div>;
}

function Mini({ rows, primary, secondary, empty }: { rows: Row[]; primary: string; secondary: string; empty: string }) {
  if (!rows.length) return <div className="v50Empty">{empty}</div>;
  return <div className="v50List">{rows.map((row) => <div className="v50Row" key={row.id}><div><strong>{row[primary] || '-'}</strong><span>{row[secondary] || '-'}</span></div></div>)}</div>;
}
