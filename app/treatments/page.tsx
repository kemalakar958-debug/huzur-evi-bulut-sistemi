'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { applyActiveFacilityFilter, useActiveFacility } from '@/lib/activeFacility';

type Row = Record<string, any>;

export default function TreatmentsPage() {
  const ctx = useActiveFacility();
  const [rows, setRows] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [form, setForm] = useState({ patient_id: '', treatment_type: 'Serum', treatment_name: '', dose: '', route: '', frequency: '', status: 'Aktif', note: '' });

  useEffect(() => { load(); }, [ctx.activeFacilityId, ctx.role, ctx.userFacilityId]);

  async function load() {
    let p = supabase.from('patients').select('*').order('full_name');
    p = applyActiveFacilityFilter(p, ctx);
    const { data: ps } = await p;
    setPatients(ps || []);
    setForm((old) => ({ ...old, patient_id: old.patient_id || ps?.[0]?.id || '' }));

    let q = supabase.from('treatment_records').select('*').order('created_at', { ascending: false }).limit(300);
    q = applyActiveFacilityFilter(q, ctx);
    const { data } = await q;
    setRows(data || []);
  }

  async function save() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return alert('Hasta seç.');
    if (!form.treatment_name) return alert('Tedavi adı yaz.');

    const { error } = await supabase.from('treatment_records').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      treatment_date: new Date().toISOString().slice(0,10),
      treatment_time: new Date().toTimeString().slice(0,5),
      treatment_type: form.treatment_type,
      treatment_name: form.treatment_name,
      dose: form.dose || null,
      route: form.route || null,
      frequency: form.frequency || null,
      status: form.status,
      note: form.note || null,
    });
    if (error) return alert(error.message);
    setForm((old) => ({ ...old, treatment_name: '', dose: '', route: '', frequency: '', note: '' }));
    await load();
  }

  return (
    <Shell>
      <div className="hero"><h2>Tedavi Sistemi</h2><p>Aktif kurum filtresine bağlı tedavi kayıtları.</p></div>
      <div className="panel">
        <div className="grid grid4">
          <div><label>Hasta</label><select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>{patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
          <div><label>Tür</label><select value={form.treatment_type} onChange={(e) => setForm({ ...form, treatment_type: e.target.value })}><option>Serum</option><option>Antibiyotik</option><option>Enjeksiyon</option><option>Dıştan Tedavi</option><option>Özel Tedavi</option><option>Nebül</option><option>Oksijen</option></select></div>
          <div><label>Tedavi</label><input value={form.treatment_name} onChange={(e) => setForm({ ...form, treatment_name: e.target.value })} /></div>
          <div><label>Doz</label><input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} /></div>
        </div>
        <div className="grid grid4">
          <div><label>Yol</label><input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} /></div>
          <div><label>Sıklık</label><input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} /></div>
          <div><label>Durum</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Aktif</option><option>Tamamlandı</option><option>Doktor Stop</option></select></div>
          <div><label>Not</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        </div>
        <div className="actions"><button className="primary" onClick={save}>Tedavi Kaydet</button></div>
      </div>
      <SimpleTable rows={rows} cols={['patient_name','treatment_date','treatment_time','treatment_type','treatment_name','dose','route','status','note']} labels={['Hasta','Tarih','Saat','Tür','Tedavi','Doz','Yol','Durum','Not']} />
    </Shell>
  );
}

function SimpleTable({ rows, cols, labels }: { rows: Row[]; cols: string[]; labels: string[] }) {
  return <div className="panel"><div className="tableWrap"><table><thead><tr>{labels.map((l) => <th key={l}>{l}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.id}>{cols.map((c) => <td key={c}>{r[c] || '-'}</td>)}</tr>)}{rows.length === 0 && <tr><td colSpan={cols.length}>Kayıt yok.</td></tr>}</tbody></table></div></div>;
}
