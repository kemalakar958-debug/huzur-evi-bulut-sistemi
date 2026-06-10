'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { applyActiveFacilityFilter, useActiveFacility } from '@/lib/activeFacility';

type Row = Record<string, any>;

const statusList = [
  'Sevk Edildi',
  'Muayene Bekliyor',
  'Tetkik Bekliyor',
  'Yatış Yapıldı',
  'Ameliyat Planlandı',
  'Taburcu Edildi',
  'Kuruma Döndü',
  'İptal',
];

export default function HospitalCasesPage() {
  const ctx = useActiveFacility();
  const [patients, setPatients] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({
    patient_id: '',
    hospital_name: '',
    clinic_name: '',
    doctor_name: '',
    referral_reason: '',
    transport_type: 'Ambulans',
    companion_name: '',
    sent_by: '',
    status: 'Sevk Edildi',
    note: '',
  });

  useEffect(() => {
    load();
  }, [ctx.activeFacilityId, ctx.role, ctx.userFacilityId]);

  async function load() {
    let patientQuery = supabase.from('patients').select('*').order('full_name');
    patientQuery = applyActiveFacilityFilter(patientQuery, ctx);

    const { data: patientRows } = await patientQuery;
    setPatients(patientRows || []);

    setForm((old) => ({
      ...old,
      patient_id: old.patient_id || patientRows?.[0]?.id || '',
    }));

    let caseQuery = supabase
      .from('hospital_cases')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    caseQuery = applyActiveFacilityFilter(caseQuery, ctx);

    const { data: caseRows } = await caseQuery;
    setRows(caseRows || []);
  }

  async function save() {
    const patient = patients.find((p) => p.id === form.patient_id);

    if (!patient) return alert('Hasta seç.');
    if (!form.hospital_name) return alert('Hastane adı yaz.');
    if (!form.referral_reason) return alert('Sevk nedeni yaz.');

    const {
      patient_id,
      ...cleanForm
    } = form;

    const { error } = await supabase.from('hospital_cases').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      departure_at: new Date().toISOString(),
      ...cleanForm,
    });

    if (error) return alert(error.message);

    await supabase
      .from('patients')
      .update({
        status: 'Hastanede',
        status_note: `${form.hospital_name} - ${form.referral_reason}`,
        status_updated_at: new Date().toISOString(),
      })
      .eq('id', patient.id);

    setForm((old) => ({
      ...old,
      hospital_name: '',
      clinic_name: '',
      doctor_name: '',
      referral_reason: '',
      companion_name: '',
      sent_by: '',
      note: '',
      status: 'Sevk Edildi',
    }));

    await load();
  }

  async function updateStatus(row: Row, status: string) {
    const patch: Row = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'Kuruma Döndü') {
      patch.returned_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('hospital_cases')
      .update(patch)
      .eq('id', row.id);

    if (error) return alert(error.message);

    if (status === 'Kuruma Döndü') {
      await supabase
        .from('patients')
        .update({
          status: 'Aktif',
          status_note: 'Hastaneden döndü',
          status_updated_at: new Date().toISOString(),
        })
        .eq('id', row.patient_id);
    }

    await load();
  }

  return (
    <Shell>
      <div className="hero">
        <h2>Hastane Süreç Merkezi</h2>
        <p>Aktif kurum filtresine bağlı hastane süreçleri.</p>
      </div>

      <div className="panel">
        <div className="grid grid4">
          <div>
            <label>Hasta</label>
            <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          <div>
            <label>Hastane</label>
            <input value={form.hospital_name} onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} />
          </div>

          <div>
            <label>Poliklinik</label>
            <input value={form.clinic_name} onChange={(e) => setForm({ ...form, clinic_name: e.target.value })} />
          </div>

          <div>
            <label>Neden</label>
            <input value={form.referral_reason} onChange={(e) => setForm({ ...form, referral_reason: e.target.value })} />
          </div>
        </div>

        <div className="grid grid4">
          <div>
            <label>Doktor</label>
            <input value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} />
          </div>

          <div>
            <label>Ulaşım</label>
            <select value={form.transport_type} onChange={(e) => setForm({ ...form, transport_type: e.target.value })}>
              <option>Ambulans</option>
              <option>Özel Araç</option>
              <option>Taksi</option>
              <option>Diğer</option>
            </select>
          </div>

          <div>
            <label>Refakatçi</label>
            <input value={form.companion_name} onChange={(e) => setForm({ ...form, companion_name: e.target.value })} />
          </div>

          <div>
            <label>Gönderen</label>
            <input value={form.sent_by} onChange={(e) => setForm({ ...form, sent_by: e.target.value })} />
          </div>
        </div>

        <div className="grid grid2">
          <div>
            <label>Durum</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {statusList.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label>Not</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>

        <div className="actions">
          <button className="primary" onClick={save}>Süreç Başlat</button>
        </div>
      </div>

      <div className="panel">
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Hasta</th>
                <th>Gidiş</th>
                <th>Hastane</th>
                <th>Poliklinik</th>
                <th>Neden</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.patient_name}</td>
                  <td>{r.departure_at ? new Date(r.departure_at).toLocaleString('tr-TR') : '-'}</td>
                  <td>{r.hospital_name}</td>
                  <td>{r.clinic_name || '-'}</td>
                  <td>{r.referral_reason || '-'}</td>
                  <td>
                    <span className={`pill ${r.status === 'Kuruma Döndü' ? 'ok' : r.status === 'İptal' ? 'danger' : 'warn'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <select value={r.status} onChange={(e) => updateStatus(r, e.target.value)}>
                      {statusList.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
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
