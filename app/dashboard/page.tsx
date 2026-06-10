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

function todayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function monthIso() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fmtDate(value: any) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('tr-TR'); } catch { return '-'; }
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
  const [docs24, setDocs24] = useState<Row[]>([]);
  const [belongings24, setBelongings24] = useState<Row[]>([]);
  const [admissionsMonth, setAdmissionsMonth] = useState<Row[]>([]);
  const [exitsMonth, setExitsMonth] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
    setLoading(true);

    const { data: facilityRows } = await supabase.from('facilities').select('*').order('name');
    setFacilities(facilityRows || []);

    const [
      patientRows,
      incidentRows,
      treatmentRows,
      taskRows,
      hospitalRows,
      depotRows,
      docRows,
      belongingRows,
      admissionRows,
      exitRows,
    ] = await Promise.all([
      queryRows('patients', 1000),
      queryRows('incident_records', 100, (q) => q.gte('created_at', last24Iso())),
      queryRows('treatment_records', 100, (q) => q.gte('created_at', last24Iso())),
      queryRows('care_tasks', 150, (q) => q.in('status', ['Aktif', 'Bekliyor'])),
      queryRows('hospital_cases', 150, (q) => q.not('status', 'in', '("Kuruma Döndü","İptal")')),
      queryRows('depot_items', 500),
      queryRows('documents', 100, (q) => q.gte('created_at', last24Iso())),
      queryRows('belonging_records', 100, (q) => q.gte('created_at', last24Iso())),
      queryRows('admission_records', 100, (q) => q.gte('created_at', monthIso())),
      queryRows('exit_records', 100, (q) => q.gte('created_at', monthIso())),
    ]);

    setPatients(patientRows);
    setIncidents24(incidentRows);
    setTreatments24(treatmentRows);
    setTasksOpen(taskRows);
    setHospitalOpen(hospitalRows);
    setCriticalDepot(depotRows.filter((d: Row) => Number(d.current_stock || 0) <= Number(d.min_stock || 0)));
    setDocs24(docRows);
    setBelongings24(belongingRows);
    setAdmissionsMonth(admissionRows);
    setExitsMonth(exitRows);
    setLoading(false);
  }

  function activeFacilityName() {
    if (ctx.role === 'founder' && ctx.activeFacilityId === 'general') return 'Genel Kontrol';
    const targetId = ctx.role === 'founder' ? ctx.activeFacilityId : ctx.userFacilityId;
    return facilities.find((f) => f.id === targetId)?.name || 'Kurum';
  }

  const activePatients = patients.filter((p) => (p.status || 'Aktif') === 'Aktif');
  const hospitalPatients = patients.filter((p) => p.status === 'Hastanede');
  const leavePatients = patients.filter((p) => p.status === 'İzinli');
  const deceasedPatients = patients.filter((p) => p.status === 'Vefat');
  const archivedPatients = patients.filter((p) => p.status === 'Arşiv' || p.status === 'Pasif');
  const todayTreatments = treatments24.filter((t) => String(t.created_at || '').startsWith(todayIso().slice(0, 10)));

  const roleTitle = ctx.role === 'founder'
    ? 'Kurucu Operasyon Paneli'
    : ctx.role === 'manager'
      ? 'Müdür Kurum Paneli'
      : ctx.role === 'nurse'
        ? 'Hemşire Günlük Paneli'
        : 'Görüntüleme Paneli';

  return (
    <Shell>
      <div className="hero">
        <h2>{roleTitle}</h2>
        <p>{activeFacilityName()} için son 24 saat, hasta durumu, olaylar, tedaviler ve kritik operasyon özeti.</p>
      </div>

      {loading && <div className="notice">Ana sayfa verileri yükleniyor...</div>}

      <div className="kpiGrid">
        <div className="kpi"><span>Toplam Hasta</span><strong>{patients.length}</strong></div>
        <div className="kpi"><span>Aktif Hasta</span><strong>{activePatients.length}</strong></div>
        <div className="kpi"><span>Hastanede</span><strong>{hospitalPatients.length}</strong></div>
        <div className="kpi"><span>İzinli</span><strong>{leavePatients.length}</strong></div>
        <div className="kpi"><span>Vefat</span><strong>{deceasedPatients.length}</strong></div>
        <div className="kpi"><span>Arşiv/Pasif</span><strong>{archivedPatients.length}</strong></div>
        <div className="kpi"><span>24s Olay</span><strong>{incidents24.length}</strong></div>
        <div className="kpi"><span>24s Tedavi</span><strong>{treatments24.length}</strong></div>
        <div className="kpi"><span>Bekleyen Görev</span><strong>{tasksOpen.length}</strong></div>
        <div className="kpi"><span>Açık Hastane</span><strong>{hospitalOpen.length}</strong></div>
        <div className="kpi"><span>Kritik Depo</span><strong>{criticalDepot.length}</strong></div>
        <div className="kpi"><span>Bu Ay Giriş/Çıkış</span><strong>{admissionsMonth.length}/{exitsMonth.length}</strong></div>
      </div>

      <div className="grid grid2">
        <PanelList title="Son 24 Saat Olay Döngüsü" desc="Düşme, yaralanma, kriz ve diğer olaylar." href="/incidents">
          <Timeline rows={incidents24.slice(0, 8)} titleField="incident_type" subField="patient_name" dateField="incident_at" empty="Son 24 saatte olay yok." />
        </PanelList>

        <PanelList title="Son 24 Saat Tedavi Döngüsü" desc="Serum, antibiyotik, enjeksiyon ve özel tedaviler." href="/treatments">
          <Timeline rows={treatments24.slice(0, 8)} titleField="treatment_name" subField="patient_name" dateField="created_at" empty="Son 24 saatte tedavi kaydı yok." />
        </PanelList>
      </div>

      <div className="grid grid3">
        <PanelList title="Hastanedeki Hastalar" desc="Açık hastane süreçleri." href="/hospital-cases">
          <MiniList rows={hospitalOpen.slice(0, 8)} primary="patient_name" secondary="hospital_name" badge="status" empty="Açık hastane süreci yok." />
        </PanelList>

        <PanelList title="Bekleyen Görevler" desc="Aktif / bekleyen görevler." href="/tasks">
          <MiniList rows={tasksOpen.slice(0, 8)} primary="title" secondary="patient_name" badge="status" empty="Bekleyen görev yok." />
        </PanelList>

        <PanelList title="Kritik Depo" desc="Minimum stok altı ürünler." href="/depot">
          <MiniList rows={criticalDepot.slice(0, 8)} primary="name" secondary="category" badge="current_stock" empty="Kritik depo ürünü yok." />
        </PanelList>
      </div>

      <div className="grid grid2">
        <div className="panel">
          <div className="panelHead">
            <div><h2>Hasta Durum Özeti</h2><p>Güncel kurum hasta dağılımı.</p></div>
            <Link className="btn soft" href="/patients">Hasta Listesi</Link>
          </div>
          <div className="statusGrid">
            <StatusBox label="Aktif" value={activePatients.length} tone="ok" />
            <StatusBox label="Hastanede" value={hospitalPatients.length} tone="warn" />
            <StatusBox label="İzinli" value={leavePatients.length} tone="info" />
            <StatusBox label="Vefat" value={deceasedPatients.length} tone="danger" />
          </div>
        </div>

        <div className="panel">
          <div className="panelHead"><div><h2>Son 24 Saat Evrak / Emanet</h2><p>Yeni yüklenen evraklar ve alınan emanetler.</p></div></div>
          <div className="statusGrid">
            <StatusBox label="Yeni Evrak" value={docs24.length} tone="info" />
            <StatusBox label="Yeni Emanet" value={belongings24.length} tone="ok" />
            <StatusBox label="Bugün Tedavi" value={todayTreatments.length} tone="warn" />
            <StatusBox label="Bu Ay Giriş" value={admissionsMonth.length} tone="ok" />
          </div>
        </div>
      </div>
    </Shell>
  );
}

function PanelList({ title, desc, href, children }: { title: string; desc: string; href: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <div className="panelHead">
        <div><h2>{title}</h2><p>{desc}</p></div>
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
          <div><b>{row[titleField] || '-'}</b><p>{row[subField] || '-'} • {fmtDate(row[dateField] || row.created_at)}</p></div>
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
          <div><b>{row[primary] || '-'}</b><span>{row[secondary] || '-'}</span></div>
          <span className="pill warn">{row[badge] || '-'}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBox({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={`statusBox ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}
