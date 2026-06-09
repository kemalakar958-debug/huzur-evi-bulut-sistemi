'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = { id: string; facility_id: string; full_name: string; };
type Transfer = {
  id: string; patient_name: string | null; transfer_at: string; return_at: string | null;
  hospital_name: string | null; reason: string | null; companion: string | null;
  transport_type: string | null; status: string; result_note: string | null; relative_notified: boolean;
};

export default function TransfersPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<Transfer[]>([]);
  const [form, setForm] = useState({ patient_id: '', transfer_at: '', hospital_name: '', reason: '', companion: '', transport_type: 'Ambulans', relative_notified: false });

  useEffect(() => {
    load();
    const channel = supabase.channel('transfers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospital_transfers' }, () => loadRecords())
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
    const { data } = await supabase.from('hospital_transfers').select('*').order('transfer_at', { ascending: false }).limit(200);
    setRecords(data || []);
  }

  async function saveTransfer() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return alert('Hasta seç.');
    const { error } = await supabase.from('hospital_transfers').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      transfer_at: form.transfer_at || new Date().toISOString(),
      hospital_name: form.hospital_name || null,
      reason: form.reason || null,
      companion: form.companion || null,
      transport_type: form.transport_type,
      status: 'Hastanede',
      relative_notified: form.relative_notified,
    });
    if (error) return alert(error.message);
    setForm((old) => ({ ...old, transfer_at: '', hospital_name: '', reason: '', companion: '', relative_notified: false }));
    await loadRecords();
  }

  async function markReturned(r: Transfer) {
    const result = prompt('Dönüş / sonuç notu:') || 'Kuruma döndü';
    const { error } = await supabase.from('hospital_transfers').update({ status: 'Kuruma Döndü', return_at: new Date().toISOString(), result_note: result }).eq('id', r.id);
    if (error) return alert(error.message);
    await loadRecords();
  }

  return (
    <Shell>
      <div className="hero"><h2>Hastane Sevk Modülü</h2><p>Sevk nedeni, hastane, refakatçi, gidiş-dönüş ve sonuç kaydı.</p></div>
      <div className="kpiGrid">
        <div className="kpi"><span>Toplam Sevk</span><strong>{records.length}</strong></div>
        <div className="kpi"><span>Hastanede</span><strong>{records.filter(r => r.status === 'Hastanede').length}</strong></div>
        <div className="kpi"><span>Dönen</span><strong>{records.filter(r => r.status === 'Kuruma Döndü').length}</strong></div>
        <div className="kpi"><span>Yakına Bildirilen</span><strong>{records.filter(r => r.relative_notified).length}</strong></div>
      </div>

      <div className="panel">
        <div className="panelHead"><div><h2>Yeni Sevk Kaydı</h2><p>Hastaneye gidiş kaydını oluştur.</p></div></div>
        <div className="grid grid4">
          <div><label>Hasta</label><select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>{patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
          <div><label>Gidiş Zamanı</label><input type="datetime-local" value={form.transfer_at} onChange={(e) => setForm({ ...form, transfer_at: e.target.value })} /></div>
          <div><label>Hastane</label><input value={form.hospital_name} onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} /></div>
          <div><label>Ulaşım</label><select value={form.transport_type} onChange={(e) => setForm({ ...form, transport_type: e.target.value })}><option>Ambulans</option><option>Özel Araç</option><option>Taksi</option><option>Diğer</option></select></div>
        </div>
        <div className="grid grid2">
          <div><label>Sevk Nedeni</label><textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          <div><label>Refakatçi / Personel</label><textarea value={form.companion} onChange={(e) => setForm({ ...form, companion: e.target.value })} /></div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input style={{ width: 'auto' }} type="checkbox" checked={form.relative_notified} onChange={(e) => setForm({ ...form, relative_notified: e.target.checked })} />Yakını bilgilendirildi</label>
        <div className="actions"><button className="primary" onClick={saveTransfer}>Sevk Kaydet</button></div>
      </div>

      <div className="panel"><div className="panelHead"><div><h2>Sevk Kayıtları</h2><p>Son 200 kayıt</p></div></div><div className="tableWrap"><table><thead><tr><th>Gidiş</th><th>Hasta</th><th>Hastane</th><th>Neden</th><th>Refakatçi</th><th>Durum</th><th>Dönüş</th><th>İşlem</th></tr></thead><tbody>
        {records.map((r) => <tr key={r.id}><td>{new Date(r.transfer_at).toLocaleString('tr-TR')}</td><td><b>{r.patient_name}</b></td><td>{r.hospital_name || '-'}</td><td>{r.reason || '-'}</td><td>{r.companion || '-'}</td><td><span className={`pill ${r.status === 'Hastanede' ? 'danger' : 'ok'}`}>{r.status}</span></td><td>{r.return_at ? new Date(r.return_at).toLocaleString('tr-TR') : '-'}</td><td>{r.status === 'Hastanede' ? <button className="green" onClick={() => markReturned(r)}>Kuruma Döndü</button> : r.result_note || '-'}</td></tr>)}
        {records.length === 0 && <tr><td colSpan={8}>Kayıt yok.</td></tr>}
      </tbody></table></div></div>
    </Shell>
  );
}
