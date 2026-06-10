'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { applyActiveFacilityFilter, getInsertFacilityId, useActiveFacility } from '@/lib/activeFacility';

type Row = Record<string, any>;

const statuses = ['Aktif','Hastanede','İzinli','Vefat','Kendi İsteğiyle Çıktı','Taburcu','Nakil','Arşiv','Pasif'];

export default function PatientsPage() {
  const ctx = useActiveFacility();
  const [facilities, setFacilities] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Aktif');

  const [form, setForm] = useState({
    facility_id: '',
    full_name: '',
    tc_no: '',
    birth_date: '',
    floor_no: '',
    room_no: '',
    bed_no: '',
    alarm_no: '',
    relative_name: '',
    relative_phone: '',
    doctor_name: '',
    diagnoses: '',
    allergies: '',
    status: 'Aktif',
  });

  useEffect(() => { load(); }, [ctx.activeFacilityId, ctx.role, ctx.userFacilityId]);

  async function load() {
    const { data: f } = await supabase.from('facilities').select('*').order('name');
    setFacilities(f || []);

    let q = supabase.from('patients').select('*').order('created_at', { ascending: false });
    q = applyActiveFacilityFilter(q, ctx);
    const { data } = await q;
    setPatients(data || []);

    const defaultFacility = getInsertFacilityId(ctx, f?.[0]?.id);
    setForm((old) => ({ ...old, facility_id: old.facility_id || defaultFacility }));
  }

  function facilityName(id: string) {
    return facilities.find((f) => f.id === id)?.name || '-';
  }

  async function createPatient() {
    const facilityId = getInsertFacilityId(ctx, form.facility_id);
    if (!facilityId) return alert('Kurum seç.');
    if (!form.full_name) return alert('Hasta adı zorunlu.');

    const { error } = await supabase.from('patients').insert({
      facility_id: facilityId,
      full_name: form.full_name,
      tc_no: form.tc_no || null,
      birth_date: form.birth_date || null,
      floor_no: form.floor_no || null,
      room_no: form.room_no || null,
      bed_no: form.bed_no || null,
      alarm_no: form.alarm_no || null,
      relative_name: form.relative_name || null,
      relative_phone: form.relative_phone || null,
      doctor_name: form.doctor_name || null,
      diagnoses: form.diagnoses || null,
      allergies: form.allergies || null,
      status: form.status,
    });

    if (error) return alert(error.message);
    setForm((old) => ({ ...old, full_name: '', tc_no: '', birth_date: '', floor_no: '', room_no: '', bed_no: '', alarm_no: '', relative_name: '', relative_phone: '', doctor_name: '', diagnoses: '', allergies: '', status: 'Aktif' }));
    await load();
  }

  async function changeStatus(p: Row, status: string) {
    const note = window.prompt('Durum notu:', '') || '';

    const { error } = await supabase.from('patients').update({
      status,
      status_note: note || null,
      status_updated_at: new Date().toISOString(),
    }).eq('id', p.id);

    if (error) return alert(error.message);

    await supabase.from('patient_status_history').insert({
      facility_id: p.facility_id,
      patient_id: p.id,
      patient_name: p.full_name,
      old_status: p.status || 'Aktif',
      new_status: status,
      note: note || null,
    });

    await load();
  }

  const rows = patients.filter((p) => {
    const q = search.toLowerCase();
    const okStatus = statusFilter === 'Tümü' || (p.status || 'Aktif') === statusFilter;
    const okSearch = !q || String(p.full_name || '').toLowerCase().includes(q) || String(p.tc_no || '').includes(q) || String(p.room_no || '').toLowerCase().includes(q);
    return okStatus && okSearch;
  });

  return (
    <Shell>
      <div className="hero">
        <h2>Hasta Listesi</h2>
        <p>Aktif kurum filtresine bağlı hasta yönetimi.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Gösterilen</span><strong>{rows.length}</strong></div>
        <div className="kpi"><span>Aktif</span><strong>{patients.filter((p) => (p.status || 'Aktif') === 'Aktif').length}</strong></div>
        <div className="kpi"><span>Hastanede</span><strong>{patients.filter((p) => p.status === 'Hastanede').length}</strong></div>
        <div className="kpi"><span>İzinli</span><strong>{patients.filter((p) => p.status === 'İzinli').length}</strong></div>
      </div>

      <div className="panel">
        <div className="panelHead"><div><h2>Yeni Hasta</h2><p>Founder kurum seçebilir; diğer roller kendi kurumuna kayıt açar.</p></div></div>
        <div className="grid grid4">
          <div><label>Kurum</label><select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value })} disabled={ctx.role !== 'founder' || ctx.activeFacilityId !== 'general'}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
          <div><label>Ad Soyad</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><label>TC</label><input value={form.tc_no} onChange={(e) => setForm({ ...form, tc_no: e.target.value })} /></div>
          <div><label>Doğum Tarihi</label><input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
        </div>
        <div className="grid grid4">
          <div><label>Kat</label><input value={form.floor_no} onChange={(e) => setForm({ ...form, floor_no: e.target.value })} /></div>
          <div><label>Oda</label><input value={form.room_no} onChange={(e) => setForm({ ...form, room_no: e.target.value })} /></div>
          <div><label>Yatak</label><input value={form.bed_no} onChange={(e) => setForm({ ...form, bed_no: e.target.value })} /></div>
          <div><label>Alarm No</label><input value={form.alarm_no} onChange={(e) => setForm({ ...form, alarm_no: e.target.value })} /></div>
        </div>
        <div className="grid grid4">
          <div><label>Yakın</label><input value={form.relative_name} onChange={(e) => setForm({ ...form, relative_name: e.target.value })} /></div>
          <div><label>Yakın Telefon</label><input value={form.relative_phone} onChange={(e) => setForm({ ...form, relative_phone: e.target.value })} /></div>
          <div><label>Doktor</label><input value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></div>
          <div><label>Durum</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div className="grid grid2">
          <div><label>Tanılar</label><textarea value={form.diagnoses} onChange={(e) => setForm({ ...form, diagnoses: e.target.value })} /></div>
          <div><label>Alerjiler</label><textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></div>
        </div>
        <div className="actions"><button className="primary" onClick={createPatient}>Hasta Kaydet</button></div>
      </div>

      <div className="panel">
        <div className="grid grid3">
          <div><label>Durum</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>Tümü</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label>Arama</label><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hasta, TC, oda..." /></div>
          <div className="notice">Aktif filtreye göre liste.</div>
        </div>
      </div>

      <div className="panel">
        <div className="tableWrap">
          <table>
            <thead><tr><th>Hasta</th><th>Kurum</th><th>Oda/Yatak</th><th>Yakın</th><th>Doktor</th><th>Durum</th><th>İşlem</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.full_name}</b><br /><small>{p.tc_no || '-'}</small></td>
                  <td>{facilityName(p.facility_id)}</td>
                  <td>{p.room_no || '-'} / {p.bed_no || '-'}</td>
                  <td>{p.relative_name || '-'}<br /><small>{p.relative_phone || '-'}</small></td>
                  <td>{p.doctor_name || '-'}</td>
                  <td><span className={`pill ${(p.status || 'Aktif') === 'Aktif' ? 'ok' : p.status === 'Vefat' || p.status === 'Pasif' ? 'danger' : 'warn'}`}>{p.status || 'Aktif'}</span></td>
                  <td><div className="actions" style={{ marginTop: 0 }}><Link className="btn soft" href={`/patients/${p.id}`}>Dosya</Link><select value={p.status || 'Aktif'} onChange={(e) => changeStatus(p, e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7}>Kayıt yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
