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
  const [remindersSoon, setRemindersSoon] = useState<Row[]>([]);
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

    const [patientRows, incidentRows, treatmentRows, taskRows, hospitalRows, depotRows, reminderRows, admissionRows, exitRows] = await Promise.all([
      queryRows('patients', 1000),
      queryRows('incident_records', 100, (q) => q.gte('created_at', last24Iso())),
      queryRows('treatment_records', 100, (q) => q.gte('created_at', last24Iso())),
      queryRows('care_tasks', 150, (q) => q.in('status', ['Aktif', 'Bekliyor'])),
      queryRows('hospital_cases', 150, (q) => q.not('status', 'in', '("Kuruma Döndü","İptal")')),
      queryRows('depot_items', 500),
      queryRows('reminder_records', 100, (q) => q.eq('status', 'Bekliyor').gte('remind_at', new Date().toISOString()).lte('remind_at', new Date(Date.now()+24*60*60*1000).toISOString())),
      queryRows('admission_records', 100, (q) => q.gte('created_at', monthIso())),
      queryRows('exit_records', 100, (q) => q.gte('created_at', monthIso())),
    ]);

    setPatients(patientRows);
    setIncidents24(incidentRows);
    setTreatments24(treatmentRows);
    setTasksOpen(taskRows);
    setHospitalOpen(hospitalRows);
    setCriticalDepot(depotRows.filter((row: Row) => Number(row.current_stock || 0) <= Number(row.min_stock || 0)));
    setRemindersSoon(reminderRows);
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
  const showManagerBlocks = ctx.role === 'founder' || ctx.role === 'manager';

  return (
    <>
      <Shell>
        <div className="v53Hero"><h2>Ana Sayfa</h2><p>{activeFacilityName()} operasyon özeti. Hemşire ve müdür sadece kendi kurumunu görür.</p></div>
        <div className="v53Stats">
          <Stat title="Toplam Hasta" value={patients.length} />
          <Stat title="Hastanede" value={hospitalPatients.length} />
          <Stat title="İzinli" value={leavePatients.length} />
          <Stat title="Son 24s Olay" value={incidents24.length} />
          <Stat title="Yaklaşan Randevu" value={remindersSoon.length} />
          <Stat title="Kritik Stok" value={criticalDepot.length} />
        </div>
        <div className="v53Grid2">
          <Panel title="Son Olaylar" href="/incidents"><List rows={incidents24.slice(0,8)} titleField="incident_type" subField="patient_name" dateField="incident_at" empty="Son 24 saatte olay yok." /></Panel>
          <Panel title="Yaklaşan Hatırlatıcılar" href="/reminders"><List rows={remindersSoon.slice(0,8)} titleField="title" subField="patient_name" dateField="remind_at" empty="Yaklaşan hatırlatıcı yok." /></Panel>
        </div>
        <div className="v53Grid3">
          <Panel title="Son Tedaviler" href="/treatments"><List rows={treatments24.slice(0,6)} titleField="treatment_name" subField="patient_name" dateField="created_at" empty="Son 24 saatte tedavi yok." /></Panel>
          <Panel title="Hastanedekiler" href="/hospital-cases"><Mini rows={hospitalOpen.slice(0,6)} primary="patient_name" secondary="hospital_name" empty="Açık hastane süreci yok." /></Panel>
          <Panel title="Kritik Stok" href="/depot"><Mini rows={criticalDepot.slice(0,6)} primary="name" secondary="category" empty="Kritik stok yok." /></Panel>
        </div>
        {showManagerBlocks && <div className="v53Grid2">
          <Panel title="Bekleyen Görevler" href="/tasks"><Mini rows={tasksOpen.slice(0,8)} primary="title" secondary="patient_name" empty="Bekleyen görev yok." /></Panel>
          <Panel title="Bu Ay Giriş / Çıkış" href="/admissions"><div className="v53Month"><div><span>Giriş</span><strong>{admissionsMonth.length}</strong></div><div><span>Çıkış</span><strong>{exitsMonth.length}</strong></div><div><span>Aktif</span><strong>{activePatients.length}</strong></div></div></Panel>
        </div>}
      </Shell>
      <style jsx global>{`
        .v53Hero{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-bottom:16px}.v53Hero h2{margin:0;color:#0f172a;font-size:28px;font-weight:900}.v53Hero p{margin:6px 0 0;color:#64748b;font-size:15px}
        .v53Stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-bottom:16px}.v53Stat{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px;box-shadow:0 8px 18px rgba(15,23,42,.04)}.v53Stat span{display:block;color:#64748b;font-size:13px;font-weight:800}.v53Stat strong{display:block;color:#0f172a;font-size:32px;font-weight:900;margin-top:8px}
        .v53Grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:16px}.v53Grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:16px}.v53Panel{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px;min-height:150px}
        .v53PanelHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.v53PanelHead h3{margin:0;color:#0f172a;font-size:18px;font-weight:900}.v53PanelHead a{color:#2563eb;font-size:13px;font-weight:900;text-decoration:none}
        .v53List{display:flex;flex-direction:column;gap:10px}.v53Row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-top:1px solid #f1f5f9;padding-top:10px}.v53Row:first-child{border-top:none;padding-top:0}.v53Row strong{display:block;color:#0f172a;font-size:14px;font-weight:900}.v53Row span,.v53Row small{display:block;color:#64748b;font-size:13px;margin-top:3px}
        .v53Empty{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px;color:#64748b;font-weight:700}.v53Month{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.v53Month div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px}.v53Month span{display:block;color:#64748b;font-size:12px;font-weight:900}.v53Month strong{display:block;color:#0f172a;font-size:26px;font-weight:900;margin-top:6px}
        @media(max-width:1100px){.v53Stats{grid-template-columns:repeat(3,minmax(0,1fr))}.v53Grid3{grid-template-columns:1fr}}@media(max-width:800px){.v53Stats{grid-template-columns:repeat(2,minmax(0,1fr))}.v53Grid2{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}

function Stat({ title, value }: { title: string; value: number }) { return <div className="v53Stat"><span>{title}</span><strong>{value}</strong></div>; }
function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) { return <div className="v53Panel"><div className="v53PanelHead"><h3>{title}</h3><Link href={href}>Tümü</Link></div>{children}</div>; }
function List({ rows, titleField, subField, dateField, empty }: { rows: Row[]; titleField: string; subField: string; dateField: string; empty: string }) {
  if (!rows.length) return <div className="v53Empty">{empty}</div>;
  return <div className="v53List">{rows.map((row) => <div className="v53Row" key={row.id}><div><strong>{row[titleField] || '-'}</strong><span>{row[subField] || row.person_name || '-'}</span></div><small>{fmtDate(row[dateField] || row.created_at)}</small></div>)}</div>;
}
function Mini({ rows, primary, secondary, empty }: { rows: Row[]; primary: string; secondary: string; empty: string }) {
  if (!rows.length) return <div className="v53Empty">{empty}</div>;
  return <div className="v53List">{rows.map((row) => <div className="v53Row" key={row.id}><div><strong>{row[primary] || '-'}</strong><span>{row[secondary] || '-'}</span></div></div>)}</div>;
}
