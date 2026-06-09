'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = { id: string; facility_id: string; full_name: string; };
type VitalRecord = {
  id: string; patient_id: string; patient_name?: string; measured_at: string;
  systolic: number | null; diastolic: number | null; pulse: number | null;
  temperature: number | null; spo2: number | null; blood_glucose: number | null;
  note: string | null;
};

function vitalAlert(v: VitalRecord) {
  const alerts: string[] = [];
  if (v.systolic && (v.systolic >= 160 || v.systolic <= 90)) alerts.push('Tansiyon');
  if (v.diastolic && (v.diastolic >= 100 || v.diastolic <= 50)) alerts.push('Diyastol');
  if (v.pulse && (v.pulse >= 120 || v.pulse <= 50)) alerts.push('Nabız');
  if (v.temperature && (v.temperature >= 38 || v.temperature <= 35)) alerts.push('Ateş');
  if (v.spo2 && v.spo2 <= 92) alerts.push('SpO2');
  if (v.blood_glucose && (v.blood_glucose >= 250 || v.blood_glucose <= 70)) alerts.push('Şeker');
  return alerts;
}

export default function VitalsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<VitalRecord[]>([]);
  const [form, setForm] = useState({
    patient_id: '', measured_at: '', systolic: '', diastolic: '',
    pulse: '', temperature: '', spo2: '', blood_glucose: '', note: '',
  });

  useEffect(() => {
    load();
    const channel = supabase.channel('vitals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vital_records' }, () => loadRecords())
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
    const { data } = await supabase.from('vital_records').select('*').order('measured_at', { ascending: false }).limit(200);
    setRecords(data || []);
  }

  async function saveVital() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return alert('Hasta seç.');
    const { error } = await supabase.from('vital_records').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      measured_at: form.measured_at || new Date().toISOString(),
      systolic: form.systolic ? Number(form.systolic) : null,
      diastolic: form.diastolic ? Number(form.diastolic) : null,
      pulse: form.pulse ? Number(form.pulse) : null,
      temperature: form.temperature ? Number(form.temperature) : null,
      spo2: form.spo2 ? Number(form.spo2) : null,
      blood_glucose: form.blood_glucose ? Number(form.blood_glucose) : null,
      note: form.note || null,
    });
    if (error) return alert(error.message);
    setForm((old) => ({ ...old, measured_at: '', systolic: '', diastolic: '', pulse: '', temperature: '', spo2: '', blood_glucose: '', note: '' }));
    await loadRecords();
  }

  const criticalCount = records.filter((r) => vitalAlert(r).length > 0).length;

  return (
    <Shell>
      <div className="hero"><h2>Vital Takip</h2><p>Tansiyon, nabız, ateş, oksijen, kan şekeri ve kritik uyarılar.</p></div>
      <div className="kpiGrid">
        <div className="kpi"><span>Toplam Kayıt</span><strong>{records.length}</strong></div>
        <div className="kpi"><span>Kritik Ölçüm</span><strong>{criticalCount}</strong></div>
        <div className="kpi"><span>Hasta</span><strong>{patients.length}</strong></div>
        <div className="kpi"><span>Son Kayıt</span><strong>{records[0] ? new Date(records[0].measured_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}</strong></div>
      </div>

      <div className="panel">
        <div className="panelHead"><div><h2>Yeni Vital Kaydı</h2><p>Kritik değerler listede uyarı olarak görünür.</p></div></div>
        <div className="grid grid4">
          <div><label>Hasta</label><select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>{patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
          <div><label>Ölçüm Zamanı</label><input type="datetime-local" value={form.measured_at} onChange={(e) => setForm({ ...form, measured_at: e.target.value })} /></div>
          <div><label>Sistolik</label><input type="number" value={form.systolic} onChange={(e) => setForm({ ...form, systolic: e.target.value })} /></div>
          <div><label>Diyastolik</label><input type="number" value={form.diastolic} onChange={(e) => setForm({ ...form, diastolic: e.target.value })} /></div>
        </div>
        <div className="grid grid4">
          <div><label>Nabız</label><input type="number" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} /></div>
          <div><label>Ateş</label><input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} /></div>
          <div><label>SpO2</label><input type="number" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} /></div>
          <div><label>Kan Şekeri</label><input type="number" value={form.blood_glucose} onChange={(e) => setForm({ ...form, blood_glucose: e.target.value })} /></div>
        </div>
        <div><label>Not</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        <div className="actions"><button className="primary" onClick={saveVital}>Vital Kaydet</button></div>
      </div>

      <div className="panel">
        <div className="panelHead"><div><h2>Vital Kayıtları</h2><p>Son 200 kayıt</p></div></div>
        <div className="tableWrap"><table><thead><tr><th>Zaman</th><th>Hasta</th><th>TA</th><th>Nabız</th><th>Ateş</th><th>SpO2</th><th>Şeker</th><th>Durum</th><th>Not</th></tr></thead><tbody>
          {records.map((r) => { const alerts = vitalAlert(r); return <tr key={r.id}><td>{new Date(r.measured_at).toLocaleString('tr-TR')}</td><td><b>{r.patient_name}</b></td><td>{r.systolic || '-'} / {r.diastolic || '-'}</td><td>{r.pulse || '-'}</td><td>{r.temperature || '-'}</td><td>{r.spo2 || '-'}</td><td>{r.blood_glucose || '-'}</td><td><span className={`pill ${alerts.length ? 'danger' : 'ok'}`}>{alerts.length ? alerts.join(', ') : 'Normal'}</span></td><td>{r.note || '-'}</td></tr>; })}
          {records.length === 0 && <tr><td colSpan={9}>Kayıt yok.</td></tr>}
        </tbody></table></div>
      </div>
    </Shell>
  );
}
