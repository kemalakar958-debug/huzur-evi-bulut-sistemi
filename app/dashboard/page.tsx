'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const [stats, setStats] = useState({ facilities: 0, patients: 0, meds: 0, depot: 0, requests: 0, lowMeds: 0, lowDepot: 0, docs: 0 });

  useEffect(() => {
    loadStats();
    const channel = supabase.channel('dashboard-realtime').on('postgres_changes', { event: '*', schema: 'public' }, () => loadStats()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function countTable(table: string) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    return count || 0;
  }

  async function loadStats() {
    const [facilities, patients, meds, depot, requests, docs] = await Promise.all([
      countTable('facilities'), countTable('patients'), countTable('medications'), countTable('depot_items'), countTable('stock_requests'), countTable('documents')
    ]);
    const { data: medRows } = await supabase.from('medications').select('stock,min_stock').eq('status','active');
    const { data: depRows } = await supabase.from('depot_items').select('current_stock,min_stock');
    setStats({
      facilities, patients, meds, depot, requests, docs,
      lowMeds: (medRows || []).filter((m:any) => Number(m.stock) <= Number(m.min_stock)).length,
      lowDepot: (depRows || []).filter((d:any) => Number(d.current_stock) <= Number(d.min_stock)).length
    });
  }

  return (
    <Shell>
      <div className="hero">
        <h2>Kurucu Dashboard 2.0</h2>
        <p>Çoklu kurum, kritik ilaç, revir depo, evrak ve iş akışı özetleri.</p>
      </div>
      <div className="kpiGrid">
        <div className="kpi"><span>Kurum</span><strong>{stats.facilities}</strong></div>
        <div className="kpi"><span>Hasta</span><strong>{stats.patients}</strong></div>
        <div className="kpi"><span>Aktif İlaç</span><strong>{stats.meds}</strong></div>
        <div className="kpi"><span>Depo Ürünü</span><strong>{stats.depot}</strong></div>
        <div className="kpi"><span>Kritik İlaç</span><strong>{stats.lowMeds}</strong></div>
        <div className="kpi"><span>Kritik Depo</span><strong>{stats.lowDepot}</strong></div>
        <div className="kpi"><span>Stok İstek</span><strong>{stats.requests}</strong></div>
        <div className="kpi"><span>Evrak</span><strong>{stats.docs}</strong></div>
      </div>
      <div className="panel">
        <div className="panelHead"><div><h2>v28 Çekirdek İyileştirmeler</h2><p>Eksik kalan temel kurumsal parçalar eklendi.</p></div><span className="pill ok">Aktif</span></div>
        <div className="grid grid3">
          <div className="notice">Şifre sıfırlama ekranı eklendi.</div>
          <div className="notice">Acil durum ve evrak modülleri eklendi.</div>
          <div className="notice">Mobil alt menü aktif edildi.</div>
        </div>
      </div>
    </Shell>
  );
}
