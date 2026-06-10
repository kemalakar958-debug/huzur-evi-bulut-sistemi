'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { applyActiveFacilityFilter, useActiveFacility } from '@/lib/activeFacility';

type Row = Record<string, any>;

export default function DocumentsPage() {
  const ctx = useActiveFacility();
  const [rows, setRows] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ patient_id: '', category: 'Kimlik Fotokopisi', title: '', note: '' });

  useEffect(() => { load(); }, [ctx.activeFacilityId, ctx.role, ctx.userFacilityId]);

  async function load() {
    let p = supabase.from('patients').select('*').order('full_name');
    p = applyActiveFacilityFilter(p, ctx);
    const { data: ps } = await p;
    setPatients(ps || []);
    setForm((old) => ({ ...old, patient_id: old.patient_id || ps?.[0]?.id || '' }));

    let q = supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(300);
    q = applyActiveFacilityFilter(q, ctx);
    const { data } = await q;
    setRows(data || []);
  }

  function safeName(name: string) { return name.replaceAll(' ', '_').replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_.-]/g, '').toLowerCase(); }

  async function save() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return alert('Hasta seç.');
    if (!file) return alert('Dosya seç.');

    const path = `${patient.facility_id}/${patient.id}/${Date.now()}_${safeName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('patient-documents').upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadError) return alert(uploadError.message);

    const { error } = await supabase.from('documents').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      category: form.category,
      title: form.title || form.category,
      note: form.note || null,
      storage_path: path,
    });
    if (error) return alert(error.message);
    setFile(null); setForm((old) => ({ ...old, title: '', note: '' })); await load();
  }

  async function openDoc(path: string) {
    const { data, error } = await supabase.storage.from('patient-documents').createSignedUrl(path, 600);
    if (error) return alert(error.message);
    window.open(data.signedUrl, '_blank');
  }

  return (
    <Shell>
      <div className="hero"><h2>Evrak Merkezi</h2><p>Aktif kurum filtresine bağlı evraklar.</p></div>
      <div className="panel"><div className="grid grid4"><div><label>Hasta</label><select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>{patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div><div><label>Kategori</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div><div><label>Başlık</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div><label>Dosya</label><input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div></div><div><label>Not</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div><div className="actions"><button className="primary" onClick={save}>Evrak Kaydet</button></div></div>
      <div className="panel"><div className="tableWrap"><table><thead><tr><th>Hasta</th><th>Kategori</th><th>Başlık</th><th>Not</th><th>Dosya</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.patient_name || '-'}</td><td>{r.category || '-'}</td><td>{r.title || '-'}</td><td>{r.note || '-'}</td><td>{r.storage_path ? <button className="soft" onClick={() => openDoc(r.storage_path)}>Aç</button> : '-'}</td></tr>)}{rows.length === 0 && <tr><td colSpan={5}>Kayıt yok.</td></tr>}</tbody></table></div></div>
    </Shell>
  );
}
