'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = { id: string; facility_id: string; full_name: string; };
type Incident = {
  id: string; patient_name: string | null; incident_at: string; incident_type: string;
  location: string | null; severity: string; description: string | null;
  intervention: string | null; relative_notified: boolean; notified_person: string | null;
};

export default function IncidentsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<Incident[]>([]);
  const [form, setForm] = useState({
    patient_id: '', incident_at: '', incident_type: 'Düşme', location: '',
    severity: 'Orta', description: '', intervention: '', relative_notified: false, notified_person: '',
  });

  useEffect(() => {
    load();
    const channel = supabase.channel('incidents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_records' }, () => loadRecords())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function load() {
    const { data: p } = await supabase.from('patients').select('id,facility_id,full_name').order('full_name');
    setPatients(p || []);
    if (p?.[0]) setForm((old) => ({ ...old, patient_id: old.patient_id || p[0].id }));
    await loadRecords();
  }

  async function loadRecords() {
    const { data } = await supabase.from('incident_records').select('*').order('incident_at', { ascending: false }).limit(200);
    setRecords(data || []);
  }

  async function saveIncident() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return alert('Hasta seç.');
    const { error } = await supabase.from('incident_records').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      incident_at: form.incident_at || new Date().toISOString(),
      incident_type: form.incident_type,
      location: form.location || null,
      severity: form.severity,
      description: form.description || null,
      intervention: form.intervention || null,
      relative_notified: form.relative_notified,
      notified_person: form.notified_person || null,
    });
    if (error) return alert(error.message);
    setForm((old) => ({ ...old, incident_at: '', location: '', description: '', intervention: '', relative_notified: false, notified_person: '' }));
    await loadRecords();
  }

  return (
    <Shell>
      <div className="hero"><h2>Olay / Düşme Kaydı</h2><p>Düşme, yaralanma, kriz, kaybolma ve kurum içi olay kaydı.</p></div>
      <div className="kpiGrid">
        <div className="kpi"><span>Toplam Olay</span><strong>{records.length}</strong></div>
        <div className="kpi"><span>Düşme</span><strong>{records.filter(r => r.incident_type === 'Düşme').length}</strong></div>
        <div className="kpi"><span>Ciddi</span><strong>{records.filter(r => r.severity === 'Ciddi' || r.severity === 'Kritik').length}</strong></div>
        <div className="kpi"><span>Yakına Bildirilen</span><strong>{records.filter(r => r.relative_notified).length}</strong></div>
      </div>

      <div className="panel">
        <div className="panelHead"><div><h2>Yeni Olay Kaydı</h2><p>Olay, müdahale ve yakın bilgilendirme kaydı oluştur.</p></div></div>
        <div className="grid grid4">
          <div><label>Hasta</label><select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>{patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
          <div><label>Olay Zamanı</label><input type="datetime-local" value={form.incident_at} onChange={(e) => setForm({ ...form, incident_at: e.target.value })} /></div>
          <div><label>Olay Türü</label><select value={form.incident_type} onChange={(e) => setForm({ ...form, incident_type: e.target.value })}><option>Düşme</option><option>Yaralanma</option><option>Kriz / Nöbet</option><option>Davranışsal Olay</option><option>Kaybolma Riski</option><option>İlaç Uygulama Sorunu</option><option>Diğer</option></select></div>
          <div><label>Şiddet</label><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option>Hafif</option><option>Orta</option><option>Ciddi</option><option>Kritik</option></select></div>
        </div>
        <div className="grid grid2">
          <div><label>Olay Yeri</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div><label>Bilgilendirilen Yakın</label><input value={form.notified_person} onChange={(e) => setForm({ ...form, notified_person: e.target.value })} /></div>
        </div>
        <div className="grid grid2">
          <div><label>Olay Açıklaması</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label>Yapılan Müdahale</label><textarea value={form.intervention} onChange={(e) => setForm({ ...form, intervention: e.target.value })} /></div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input style={{ width: 'auto' }} type="checkbox" checked={form.relative_notified} onChange={(e) => setForm({ ...form, relative_notified: e.target.checked })} />Yakını bilgilendirildi</label>
        <div className="actions"><button className="primary" onClick={saveIncident}>Olay Kaydet</button></div>
      </div>

      <div className="panel"><div className="panelHead"><div><h2>Olay Kayıtları</h2><p>Son 200 kayıt</p></div></div><div className="tableWrap"><table><thead><tr><th>Zaman</th><th>Hasta</th><th>Tür</th><th>Yer</th><th>Şiddet</th><th>Yakın</th><th>Açıklama</th><th>Müdahale</th></tr></thead><tbody>
        {records.map((r) => <tr key={r.id}><td>{new Date(r.incident_at).toLocaleString('tr-TR')}</td><td><b>{r.patient_name}</b></td><td>{r.incident_type}</td><td>{r.location || '-'}</td><td><span className={`pill ${['Ciddi','Kritik'].includes(r.severity) ? 'danger' : 'warn'}`}>{r.severity}</span></td><td>{r.relative_notified ? `Evet - ${r.notified_person || '-'}` : 'Hayır'}</td><td>{r.description || '-'}</td><td>{r.intervention || '-'}</td></tr>)}
        {records.length === 0 && <tr><td colSpan={8}>Kayıt yok.</td></tr>}
      </tbody></table></div></div>
    </Shell>
  );
}
