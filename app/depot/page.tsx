'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { applyActiveFacilityFilter, getInsertFacilityId, useActiveFacility } from '@/lib/activeFacility';

type Row = Record<string, any>;

export default function DepotPage() {
  const ctx = useActiveFacility();
  const [facilities, setFacilities] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ facility_id: '', name: '', category: 'İlaç', current_stock: '0', min_stock: '0', max_stock: '0' });

  useEffect(() => { load(); }, [ctx.activeFacilityId, ctx.role, ctx.userFacilityId]);

  async function load() {
    const { data: f } = await supabase.from('facilities').select('*').order('name');
    setFacilities(f || []);
    setForm((old) => ({ ...old, facility_id: old.facility_id || getInsertFacilityId(ctx, f?.[0]?.id) }));

    let q = supabase.from('depot_items').select('*').order('name').limit(500);
    q = applyActiveFacilityFilter(q, ctx);
    const { data } = await q;
    setRows(data || []);
  }

  async function save() {
    const facilityId = getInsertFacilityId(ctx, form.facility_id);
    if (!facilityId) return alert('Kurum seç.');
    if (!form.name) return alert('Ürün adı yaz.');
    const { error } = await supabase.from('depot_items').insert({
      facility_id: facilityId,
      name: form.name,
      category: form.category,
      current_stock: Number(form.current_stock || 0),
      min_stock: Number(form.min_stock || 0),
      max_stock: Number(form.max_stock || 0),
    });
    if (error) return alert(error.message);
    setForm((old) => ({ ...old, name: '', current_stock: '0', min_stock: '0', max_stock: '0' }));
    await load();
  }

  async function updateStock(row: Row, value: string) {
    const { error } = await supabase.from('depot_items').update({ current_stock: Number(value || 0) }).eq('id', row.id);
    if (error) return alert(error.message);
    await load();
  }

  const critical = rows.filter((r) => Number(r.current_stock || 0) <= Number(r.min_stock || 0));

  return (
    <Shell>
      <div className="hero"><h2>Revir Deposu</h2><p>Aktif kurum filtresine bağlı depo.</p></div>
      <div className="kpiGrid"><div className="kpi"><span>Ürün</span><strong>{rows.length}</strong></div><div className="kpi"><span>Kritik</span><strong>{critical.length}</strong></div></div>
      <div className="panel">
        <div className="grid grid5">
          <div><label>Kurum</label><select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value })} disabled={ctx.role !== 'founder' || ctx.activeFacilityId !== 'general'}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
          <div><label>Ürün</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Kategori</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>İlaç</option><option>Serum</option><option>Sarf Malzeme</option><option>Medikal Cihaz</option><option>Temizlik</option><option>Diğer</option></select></div>
          <div><label>Stok</label><input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} /></div>
          <div><label>Min</label><input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
        </div>
        <div className="actions"><button className="primary" onClick={save}>Ürün Kaydet</button></div>
      </div>
      <div className="panel"><div className="tableWrap"><table><thead><tr><th>Ürün</th><th>Kategori</th><th>Stok</th><th>Min</th><th>Durum</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td><b>{r.name}</b></td><td>{r.category || '-'}</td><td><input type="number" defaultValue={r.current_stock || 0} onBlur={(e) => updateStock(r, e.target.value)} /></td><td>{r.min_stock || 0}</td><td><span className={`pill ${Number(r.current_stock || 0) <= Number(r.min_stock || 0) ? 'danger' : 'ok'}`}>{Number(r.current_stock || 0) <= Number(r.min_stock || 0) ? 'Kritik' : 'Normal'}</span></td></tr>)}{rows.length === 0 && <tr><td colSpan={5}>Kayıt yok.</td></tr>}</tbody></table></div></div>
    </Shell>
  );
}
