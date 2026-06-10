'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { applyActiveFacilityFilter, useActiveFacility } from '@/lib/activeFacility';

type Row = Record<string, any>;

export default function IncidentsPage() {
  const ctx = useActiveFacility();
  const [rows, setRows] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [form, setForm] = useState({ patient_id: '', incident_type: 'Düşme', location: '', severity: 'Orta', description: '', status: 'Aktif' });

  useEffect(() => { load(); }, [ctx.activeFacilityId, ctx.role, ctx.userFacilityId]);

  async function load() {
    let p = supabase.from('patients').select('*').order('full_name');
    p = applyActiveFacilityFilter(p, ctx);
    const { data: ps } = await p;
    setPatients(ps || []);
    setForm((old) => ({ ...old, patient_id: old.patient_id || ps?.[0]?.id || '' }));
    let q = supabase.from('incident_records').select('*').order('created_at', { ascending: false }).limit(300);
    q = applyActiveFacilityFilter(q, ctx);
    const { data } = await q;
    setRows(data || []);
  }

  async function save() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return alert('Hasta seç.');
    const { error } = await supabase.from('incident_records').insert({ facility_id: patient.facility_id, patient_id: patient.id, patient_name: patient.full_name, incident_at: new Date().toISOString(), ...form });
    if (error) return alert(error.message);
    setForm((old) => ({ ...old, location: '', description: '', severity: 'Orta', status: 'Aktif' })); await load();
  }

  return (
    <Shell>
      <div className="hero"><h2>Olay / Düşme</h2><p>Aktif kurum filtresine bağlı olay kayıtları.</p></div>
      <div className="panel"><div className="grid grid4"><div><label>Hasta</label><select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>{patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div><div><label>Tür</label><select value={form.incident_type} onChange={(e) => setForm({ ...form, incident_type: e.target.value })}><option>Düşme</option><option>Yaralanma</option><option>Kriz</option><option>Davranışsal Olay</option><option>Diğer</option></select></div><div><label>Yer</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div><div><label>Şiddet</label><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option>Düşük</option><option>Orta</option><option>Yüksek</option><option>Kritik</option></select></div></div><div><label>Açıklama</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div className="actions"><button className="primary" onClick={save}>Olay Kaydet</button></div></div>
      <div className="panel"><div className="tableWrap"><table><thead><tr><th>Hasta</th><th>Zaman</th><th>Tür</th><th>Yer</th><th>Şiddet</th><th>Açıklama</th><th>Durum</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.patient_name || '-'}</td><td>{r.incident_at ? new Date(r.incident_at).toLocaleString('tr-TR') : '-'}</td><td>{r.incident_type || '-'}</td><td>{r.location || '-'}</td><td>{r.severity || '-'}</td><td>{r.description || '-'}</td><td>{r.status || '-'}</td></tr>)}{rows.length === 0 && <tr><td colSpan={7}>Kayıt yok.</td></tr>}</tbody></table></div></div>
    </Shell>
  );
}
