'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import FounderGuard from '@/components/FounderGuard';
import { supabase } from '@/lib/supabaseClient';

type Facility = Record<string, any>;
type FacilityStats = Record<string, number>;

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function last24Iso() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export default function FounderDashboardPage() {
  return (
    <Shell>
      <FounderGuard title="Kurucu Dashboard Pro">
        <FounderDashboardContent />
      </FounderGuard>
    </Shell>
  );
}

function FounderDashboardContent() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [stats, setStats] = useState<Record<string, FacilityStats>>({});
  const [criticalMeds, setCriticalMeds] = useState<any[]>([]);
  const [criticalDepot, setCriticalDepot] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [recentTreatments, setRecentTreatments] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [selectedFacility, setSelectedFacility] = useState('all');

  useEffect(() => {
    load();
    const channel = supabase
      .channel('founder-dashboard-pro')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function safeCount(table: string, facilityId: string, field = 'facility_id') {
    try {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq(field, facilityId);
      return count || 0;
    } catch {
      return 0;
    }
  }

  async function safeCountWhere(table: string, facilityId: string, filter: (query: any) => any) {
    try {
      let query = supabase.from(table).select('*', { count: 'exact', head: true }).eq('facility_id', facilityId);
      query = filter(query);
      const { count } = await query;
      return count || 0;
    } catch {
      return 0;
    }
  }

  async function load() {
    const { data: facilityRows } = await supabase.from('facilities').select('*').order('name');
    const facilityList = facilityRows || [];
    setFacilities(facilityList);

    const next: Record<string, FacilityStats> = {};
    const today = startOfTodayIso();
    const last24 = last24Iso();

    for (const f of facilityList) {
      const [
        patients,
        beds,
        emptyBeds,
        meds,
        treatments,
        treatmentsToday,
        incidents,
        incidents24h,
        transfers,
        tasks,
        pendingTasks,
        docs,
        depot,
        belongings,
        admissions,
        exits,
      ] = await Promise.all([
        safeCount('patients', f.id),
        safeCount('room_bed_records', f.id),
        safeCountWhere('room_bed_records', f.id, (q) => q.eq('bed_status', 'Boş')),
        safeCount('medications', f.id),
        safeCount('treatment_records', f.id),
        safeCountWhere('treatment_records', f.id, (q) => q.gte('created_at', today)),
        safeCount('incident_records', f.id),
        safeCountWhere('incident_records', f.id, (q) => q.gte('created_at', last24)),
        safeCount('hospital_transfers', f.id),
        safeCount('care_tasks', f.id),
        safeCountWhere('care_tasks', f.id, (q) => q.in('status', ['Aktif', 'Bekliyor'])),
        safeCount('documents', f.id),
        safeCount('depot_items', f.id),
        safeCount('belonging_records', f.id),
        safeCount('admission_records', f.id),
        safeCount('exit_records', f.id),
      ]);

      next[f.id] = {
        patients,
        beds,
        emptyBeds,
        occupiedBeds: Math.max(0, beds - emptyBeds),
        meds,
        treatments,
        treatmentsToday,
        incidents,
        incidents24h,
        transfers,
        tasks,
        pendingTasks,
        docs,
        depot,
        belongings,
        admissions,
        exits,
        capacity: Number(f.capacity || 0),
      };
    }

    setStats(next);

    await Promise.all([
      loadCriticalMeds(),
      loadCriticalDepot(),
      loadPendingRequests(),
      loadRecentIncidents(),
      loadRecentTreatments(),
      loadRecentTasks(),
    ]);
  }

  async function loadCriticalMeds() {
    try {
      const { data } = await supabase.from('medications').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(500);
      setCriticalMeds((data || []).filter((x: any) => Number(x.stock || 0) <= Number(x.min_stock || 0)));
    } catch {
      setCriticalMeds([]);
    }
  }

  async function loadCriticalDepot() {
    try {
      const { data } = await supabase.from('depot_items').select('*').order('created_at', { ascending: false }).limit(500);
      setCriticalDepot((data || []).filter((x: any) => Number(x.current_stock || 0) <= Number(x.min_stock || 0)));
    } catch {
      setCriticalDepot([]);
    }
  }

  async function loadPendingRequests() {
    try {
      const { data } = await supabase
        .from('interfacility_stock_requests')
        .select('*')
        .in('status', ['Bekliyor', 'Onaylandı'])
        .order('created_at', { ascending: false })
        .limit(100);
      setPendingRequests(data || []);
    } catch {
      setPendingRequests([]);
    }
  }

  async function loadRecentIncidents() {
    try {
      const { data } = await supabase
        .from('incident_records')
        .select('*')
        .gte('created_at', last24Iso())
        .order('created_at', { ascending: false })
        .limit(50);
      setRecentIncidents(data || []);
    } catch {
      setRecentIncidents([]);
    }
  }

  async function loadRecentTreatments() {
    try {
      const { data } = await supabase
        .from('treatment_records')
        .select('*')
        .gte('created_at', last24Iso())
        .order('created_at', { ascending: false })
        .limit(50);
      setRecentTreatments(data || []);
    } catch {
      setRecentTreatments([]);
    }
  }

  async function loadRecentTasks() {
    try {
      const { data } = await supabase
        .from('care_tasks')
        .select('*')
        .in('status', ['Aktif', 'Bekliyor'])
        .order('created_at', { ascending: false })
        .limit(50);
      setRecentTasks(data || []);
    } catch {
      setRecentTasks([]);
    }
  }

  function facilityName(id: string | null | undefined) {
    if (!id) return '-';
    return facilities.find((f) => f.id === id)?.name || '-';
  }

  const visibleFacilities = selectedFacility === 'all'
    ? facilities
    : facilities.filter((f) => f.id === selectedFacility);

  const totals = visibleFacilities.reduce((acc: Record<string, number>, f) => {
    const s = stats[f.id] || {};
    Object.keys(s).forEach((key) => {
      acc[key] = Number(acc[key] || 0) + Number(s[key] || 0);
    });
    return acc;
  }, {});

  const occupancyRate = totals.beds ? Math.round((Number(totals.occupiedBeds || 0) / Number(totals.beds || 0)) * 100) : 0;
  const capacityRate = totals.capacity ? Math.round((Number(totals.patients || 0) / Number(totals.capacity || 0)) * 100) : 0;

  return (
    <>
      <div className="hero">
        <h2>Kurucu Dashboard Pro</h2>
        <p>Tüm kurumlar, doluluk, boş yatak, kritik stok, son 24 saat olayları ve kurumlar arası istekler tek ekranda.</p>
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
          <div className="notice">Bu ekran sadece kurucu/founder yetkisine açıktır.</div>
        </div>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Kurum</span><strong>{visibleFacilities.length}</strong></div>
        <div className="kpi"><span>Toplam Hasta</span><strong>{totals.patients || 0}</strong></div>
        <div className="kpi"><span>Kapasite</span><strong>{totals.capacity || 0}</strong></div>
        <div className="kpi"><span>Kapasite Doluluk</span><strong>%{capacityRate}</strong></div>
        <div className="kpi"><span>Yatak</span><strong>{totals.beds || 0}</strong></div>
        <div className="kpi"><span>Boş Yatak</span><strong>{totals.emptyBeds || 0}</strong></div>
        <div className="kpi"><span>Yatak Doluluk</span><strong>%{occupancyRate}</strong></div>
        <div className="kpi"><span>Bugünkü Tedavi</span><strong>{totals.treatmentsToday || 0}</strong></div>
        <div className="kpi"><span>Son 24s Olay</span><strong>{totals.incidents24h || 0}</strong></div>
        <div className="kpi"><span>Bekleyen Görev</span><strong>{totals.pendingTasks || 0}</strong></div>
        <div className="kpi"><span>Kritik İlaç</span><strong>{criticalMeds.length}</strong></div>
        <div className="kpi"><span>Kritik Depo</span><strong>{criticalDepot.length}</strong></div>
      </div>

      <div className="grid grid2">
        <div className="panel">
          <div className="panelHead"><div><h2>Kritik Uyarılar</h2><p>Hemen takip edilmesi gerekenler.</p></div></div>
          <div className="grid grid2">
            <div className="notice">Kritik ilaç stoğu: <b>{criticalMeds.length}</b></div>
            <div className="notice">Kritik depo ürünü: <b>{criticalDepot.length}</b></div>
            <div className="notice">Bekleyen kurum isteği: <b>{pendingRequests.filter((x) => x.status === 'Bekliyor').length}</b></div>
            <div className="notice">Onaylı gönderim bekleyen: <b>{pendingRequests.filter((x) => x.status === 'Onaylandı').length}</b></div>
          </div>
        </div>

        <div className="panel">
          <div className="panelHead"><div><h2>Son 24 Saat</h2><p>Canlı operasyon özeti.</p></div></div>
          <div className="grid grid2">
            <div className="notice">Olay/Düşme: <b>{recentIncidents.length}</b></div>
            <div className="notice">Tedavi kaydı: <b>{recentTreatments.length}</b></div>
            <div className="notice">Bekleyen görev: <b>{recentTasks.length}</b></div>
            <div className="notice">Kurum sayısı: <b>{facilities.length}</b></div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Kurum Bazlı Kurucu Özeti</h2>
            <p>Doluluk, hasta, tedavi, olay, evrak, depo ve görev sayıları.</p>
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
                <th>Yatak</th>
                <th>Boş</th>
                <th>Doluluk</th>
                <th>Bugün Tedavi</th>
                <th>24s Olay</th>
                <th>Bekleyen Görev</th>
                <th>Evrak</th>
                <th>Depo</th>
              </tr>
            </thead>
            <tbody>
              {visibleFacilities.map((facility) => {
                const s = stats[facility.id] || {};
                const facilityRate = s.beds ? Math.round((Number(s.occupiedBeds || 0) / Number(s.beds || 0)) * 100) : 0;
                return (
                  <tr key={facility.id}>
                    <td><b>{facility.name}</b><br /><small>{facility.manager_name || '-'} • {facility.phone || '-'}</small></td>
                    <td><span className={`pill ${facility.status === 'Aktif' ? 'ok' : facility.status === 'Pasif' ? 'danger' : 'warn'}`}>{facility.status || 'Aktif'}</span></td>
                    <td>{facility.capacity || '-'}</td>
                    <td>{s.patients || 0}</td>
                    <td>{s.beds || 0}</td>
                    <td>{s.emptyBeds || 0}</td>
                    <td>%{facilityRate}</td>
                    <td>{s.treatmentsToday || 0}</td>
                    <td>{s.incidents24h || 0}</td>
                    <td>{s.pendingTasks || 0}</td>
                    <td>{s.docs || 0}</td>
                    <td>{s.depot || 0}</td>
                  </tr>
                );
              })}
              {visibleFacilities.length === 0 && <tr><td colSpan={12}>Kurum yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid2">
        <div className="panel">
          <div className="panelHead"><div><h2>Kurumlar Arası Bekleyen İstekler</h2><p>Patron onayı/gönderimi bekleyenler.</p></div></div>
          <div className="tableWrap">
            <table>
              <thead><tr><th>Kurum</th><th>Ürün</th><th>Miktar</th><th>Öncelik</th><th>Durum</th></tr></thead>
              <tbody>
                {pendingRequests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.requesting_facility_name || facilityName(r.requesting_facility_id)}</td>
                    <td>{r.product_name}</td>
                    <td>{r.requested_qty}</td>
                    <td>{r.priority}</td>
                    <td>{r.status}</td>
                  </tr>
                ))}
                {pendingRequests.length === 0 && <tr><td colSpan={5}>Bekleyen istek yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panelHead"><div><h2>Kritik Stoklar</h2><p>İlaç ve depo kritik eşikleri.</p></div></div>
          <div className="tableWrap">
            <table>
              <thead><tr><th>Tür</th><th>Ürün</th><th>Stok</th><th>Min</th><th>Kurum</th></tr></thead>
              <tbody>
                {criticalMeds.slice(0, 20).map((m) => (
                  <tr key={`m-${m.id}`}><td>İlaç</td><td>{m.drug_name}</td><td>{m.stock}</td><td>{m.min_stock}</td><td>{facilityName(m.facility_id)}</td></tr>
                ))}
                {criticalDepot.slice(0, 20).map((d) => (
                  <tr key={`d-${d.id}`}><td>Depo</td><td>{d.name}</td><td>{d.current_stock}</td><td>{d.min_stock}</td><td>{facilityName(d.facility_id)}</td></tr>
                ))}
                {criticalMeds.length + criticalDepot.length === 0 && <tr><td colSpan={5}>Kritik stok yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
