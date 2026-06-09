'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Facility = Record<string, any>;
type Patient = Record<string, any>;

const statuses = [
  'Aktif',
  'Hastanede',
  'İzinli',
  'Vefat',
  'Kendi İsteğiyle Çıktı',
  'Taburcu',
  'Nakil',
  'Arşiv',
  'Pasif',
];

export default function PatientsPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filtered, setFiltered] = useState<Patient[]>([]);
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Aktif');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    facility_id: '',
    full_name: '',
    tc_no: '',
    birth_date: '',
    room_no: '',
    bed_no: '',
    floor_no: '',
    alarm_no: '',
    relative_name: '',
    relative_phone: '',
    doctor_name: '',
    diagnoses: '',
    allergies: '',
    status: 'Aktif',
  });

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [patients, selectedFacility, statusFilter, search]);

  async function load() {
    const { data: facilityRows } = await supabase.from('facilities').select('*').order('name');
    setFacilities(facilityRows || []);

    if (facilityRows?.[0]) {
      setForm((old) => ({ ...old, facility_id: old.facility_id || facilityRows[0].id }));
    }

    const { data: patientRows } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    setPatients(patientRows || []);
  }

  function applyFilters() {
    let rows = [...patients];

    if (selectedFacility !== 'all') {
      rows = rows.filter((p) => p.facility_id === selectedFacility);
    }

    if (statusFilter !== 'Tümü') {
      rows = rows.filter((p) => (p.status || 'Aktif') === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((p) =>
        String(p.full_name || '').toLowerCase().includes(q) ||
        String(p.tc_no || '').toLowerCase().includes(q) ||
        String(p.room_no || '').toLowerCase().includes(q) ||
        String(p.relative_name || '').toLowerCase().includes(q)
      );
    }

    setFiltered(rows);
  }

  function facilityName(id: string | null) {
    if (!id) return '-';
    return facilities.find((f) => f.id === id)?.name || '-';
  }

  async function createPatient() {
    if (!form.facility_id) return alert('Kurum seç.');
    if (!form.full_name) return alert('Hasta adı zorunlu.');

    const { error } = await supabase.from('patients').insert({
      facility_id: form.facility_id,
      full_name: form.full_name,
      tc_no: form.tc_no || null,
      birth_date: form.birth_date || null,
      room_no: form.room_no || null,
      bed_no: form.bed_no || null,
      floor_no: form.floor_no || null,
      alarm_no: form.alarm_no || null,
      relative_name: form.relative_name || null,
      relative_phone: form.relative_phone || null,
      doctor_name: form.doctor_name || null,
      diagnoses: form.diagnoses || null,
      allergies: form.allergies || null,
      status: form.status || 'Aktif',
    });

    if (error) return alert(error.message);

    setForm((old) => ({
      ...old,
      full_name: '',
      tc_no: '',
      birth_date: '',
      room_no: '',
      bed_no: '',
      floor_no: '',
      alarm_no: '',
      relative_name: '',
      relative_phone: '',
      doctor_name: '',
      diagnoses: '',
      allergies: '',
      status: 'Aktif',
    }));

    await load();
    alert('Hasta kaydedildi.');
  }

  async function changeStatus(patient: Patient, status: string) {
    const note = window.prompt(`${patient.full_name} için durum notu yazabilirsin:`, '') || '';

    const { error } = await supabase
      .from('patients')
      .update({
        status,
        status_note: note || null,
        status_updated_at: new Date().toISOString(),
      })
      .eq('id', patient.id);

    if (error) return alert(error.message);

    await supabase.from('patient_status_history').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      old_status: patient.status || 'Aktif',
      new_status: status,
      note: note || null,
    });

    await load();
  }

  async function archivePatient(patient: Patient) {
    if (!confirm(`${patient.full_name} arşive alınsın mı? Hasta silinmez, sadece Arşiv durumuna geçer.`)) return;
    await changeStatus(patient, 'Arşiv');
  }

  async function softDeletePatient(patient: Patient) {
    if (!confirm(`${patient.full_name} pasif hale getirilsin mi? Veri silinmez.`)) return;
    await changeStatus(patient, 'Pasif');
  }

  const total = patients.length;
  const active = patients.filter((p) => (p.status || 'Aktif') === 'Aktif').length;
  const hospital = patients.filter((p) => p.status === 'Hastanede').length;
  const leave = patients.filter((p) => p.status === 'İzinli').length;
  const archived = patients.filter((p) => p.status === 'Arşiv').length;

  return (
    <Shell>
      <div className="hero">
        <h2>Hasta Listesi / Durum Yönetimi</h2>
        <p>Aktif, hastanede, izinli, vefat, kendi isteğiyle çıktı, taburcu, nakil ve arşiv yönetimi.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Toplam</span><strong>{total}</strong></div>
        <div className="kpi"><span>Aktif</span><strong>{active}</strong></div>
        <div className="kpi"><span>Hastanede</span><strong>{hospital}</strong></div>
        <div className="kpi"><span>İzinli</span><strong>{leave}</strong></div>
        <div className="kpi"><span>Arşiv</span><strong>{archived}</strong></div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Yeni Hasta Ekle</h2>
            <p>Hasta kuruma bağlanır ve varsayılan olarak Aktif açılır.</p>
          </div>
        </div>

        <div className="grid grid4">
          <div>
            <label>Kurum</label>
            <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value })}>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
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
          <div><label>Yakın Adı</label><input value={form.relative_name} onChange={(e) => setForm({ ...form, relative_name: e.target.value })} /></div>
          <div><label>Yakın Telefon</label><input value={form.relative_phone} onChange={(e) => setForm({ ...form, relative_phone: e.target.value })} /></div>
          <div><label>Doktor</label><input value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></div>
          <div>
            <label>Durum</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid2">
          <div><label>Tanılar</label><textarea value={form.diagnoses} onChange={(e) => setForm({ ...form, diagnoses: e.target.value })} /></div>
          <div><label>Alerjiler</label><textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></div>
        </div>

        <div className="actions">
          <button className="primary" onClick={createPatient}>Hasta Kaydet</button>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Filtreler</h2>
            <p>Listeyi kurum, durum veya arama ile süz.</p>
          </div>
        </div>

        <div className="grid grid4">
          <div>
            <label>Kurum</label>
            <select value={selectedFacility} onChange={(e) => setSelectedFacility(e.target.value)}>
              <option value="all">Tüm Kurumlar</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div>
            <label>Durum</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>Tümü</option>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label>Arama</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hasta, TC, oda, yakın..." />
          </div>

          <div className="notice">Gösterilen kayıt: <b>{filtered.length}</b></div>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Hasta Listesi</h2>
            <p>Silmek yerine durum değiştir: Hastanede, İzinli, Vefat, Kendi İsteğiyle Çıktı, Arşiv.</p>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Hasta</th>
                <th>Kurum</th>
                <th>Oda/Yatak</th>
                <th>Yakın</th>
                <th>Doktor</th>
                <th>Durum</th>
                <th>Son Not</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.full_name}</b><br />
                    <small>TC: {p.tc_no || '-'}</small>
                  </td>
                  <td>{facilityName(p.facility_id)}</td>
                  <td>{p.room_no || '-'} / {p.bed_no || '-'}</td>
                  <td>{p.relative_name || '-'}<br /><small>{p.relative_phone || '-'}</small></td>
                  <td>{p.doctor_name || '-'}</td>
                  <td>
                    <span className={`pill ${(p.status || 'Aktif') === 'Aktif' ? 'ok' : p.status === 'Vefat' || p.status === 'Pasif' ? 'danger' : 'warn'}`}>
                      {p.status || 'Aktif'}
                    </span>
                  </td>
                  <td>{p.status_note || '-'}</td>
                  <td>
                    <div className="actions" style={{ marginTop: 0 }}>
                      <Link className="btn soft" href={`/patients/${p.id}`}>Dosya</Link>
                      <select value={p.status || 'Aktif'} onChange={(e) => changeStatus(p, e.target.value)}>
                        {statuses.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button className="amber" onClick={() => archivePatient(p)}>Arşiv</button>
                      <button className="red" onClick={() => softDeletePatient(p)}>Pasif</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8}>Kayıt yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
