'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = { id: string; facility_id: string; full_name: string };
type Treatment = Record<string, any>;

export default function TreatmentsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<Treatment[]>([]);
  const [form, setForm] = useState({
    patient_id: '',
    treatment_date: new Date().toISOString().slice(0, 10),
    treatment_time: '',
    treatment_type: 'Serum',
    treatment_name: '',
    route: 'IV',
    dose: '',
    frequency: '',
    applied_by: '',
    doctor_name: '',
    status: 'Uygulandı',
    note: '',
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: patientRows } = await supabase
      .from('patients')
      .select('id, facility_id, full_name')
      .order('full_name');

    setPatients(patientRows || []);

    if (patientRows?.[0]) {
      setForm((old) => ({ ...old, patient_id: old.patient_id || patientRows[0].id }));
    }

    await loadRecords();
  }

  async function loadRecords() {
    const { data } = await supabase
      .from('treatment_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    setRecords(data || []);
  }

  async function saveTreatment() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return alert('Hasta seç.');
    if (!form.treatment_name) return alert('Tedavi / ilaç / serum adı yaz.');

    const { error } = await supabase.from('treatment_records').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      treatment_date: form.treatment_date,
      treatment_time: form.treatment_time || null,
      treatment_type: form.treatment_type,
      treatment_name: form.treatment_name,
      route: form.route || null,
      dose: form.dose || null,
      frequency: form.frequency || null,
      applied_by: form.applied_by || null,
      doctor_name: form.doctor_name || null,
      status: form.status,
      note: form.note || null,
    });

    if (error) return alert(error.message);

    setForm((old) => ({
      ...old,
      treatment_time: '',
      treatment_name: '',
      dose: '',
      frequency: '',
      applied_by: '',
      doctor_name: '',
      status: 'Uygulandı',
      note: '',
    }));

    await loadRecords();
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('treatment_records')
      .update({ status })
      .eq('id', id);

    if (error) return alert(error.message);
    await loadRecords();
  }

  return (
    <Shell>
      <div className="hero">
        <h2>Tedavi Sistemi</h2>
        <p>Özel tedavi, dıştan tedavi, antibiyotik, serum, enjeksiyon ve günlük tedavi kayıtları.</p>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Yeni Tedavi Kaydı</h2>
            <p>Kayıt hastanın dosyasına bağlanır.</p>
          </div>
        </div>

        <div className="grid grid4">
          <div>
            <label>Hasta</label>
            <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Tarih</label>
            <input type="date" value={form.treatment_date} onChange={(e) => setForm({ ...form, treatment_date: e.target.value })} />
          </div>

          <div>
            <label>Saat</label>
            <input type="time" value={form.treatment_time} onChange={(e) => setForm({ ...form, treatment_time: e.target.value })} />
          </div>

          <div>
            <label>Tedavi Türü</label>
            <select value={form.treatment_type} onChange={(e) => setForm({ ...form, treatment_type: e.target.value })}>
              <option>Serum</option>
              <option>Antibiyotik</option>
              <option>Enjeksiyon</option>
              <option>Dıştan Tedavi</option>
              <option>Özel Tedavi</option>
              <option>Nebül / Buhar</option>
              <option>Göz / Kulak Damla</option>
              <option>Krem / Merhem</option>
              <option>Oksijen</option>
              <option>Diğer</option>
            </select>
          </div>
        </div>

        <div className="grid grid4">
          <div>
            <label>Tedavi / İlaç / Serum Adı</label>
            <input value={form.treatment_name} onChange={(e) => setForm({ ...form, treatment_name: e.target.value })} />
          </div>

          <div>
            <label>Uygulama Yolu</label>
            <select value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })}>
              <option>IV</option>
              <option>IM</option>
              <option>SC</option>
              <option>PO</option>
              <option>Dıştan</option>
              <option>Nebül</option>
              <option>Damla</option>
              <option>Oksijen</option>
              <option>Diğer</option>
            </select>
          </div>

          <div>
            <label>Doz / Miktar</label>
            <input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="500 ml, 1 ampul..." />
          </div>

          <div>
            <label>Sıklık</label>
            <input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="Günde 2, 12 saatte 1..." />
          </div>
        </div>

        <div className="grid grid4">
          <div>
            <label>Uygulayan</label>
            <input value={form.applied_by} onChange={(e) => setForm({ ...form, applied_by: e.target.value })} />
          </div>

          <div>
            <label>Doktor</label>
            <input value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} />
          </div>

          <div>
            <label>Durum</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Uygulandı</option>
              <option>Bekliyor</option>
              <option>Uygulanmadı</option>
              <option>Reddetti</option>
              <option>Doktor Stop</option>
              <option>Tamamlandı</option>
            </select>
          </div>

          <div>
            <label>Not</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>

        <div className="actions">
          <button className="primary" onClick={saveTreatment}>Tedavi Kaydet</button>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Tedavi Kayıtları</h2>
            <p>Son 300 kayıt</p>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Hasta</th>
                <th>Tür</th>
                <th>Tedavi</th>
                <th>Yol</th>
                <th>Doz</th>
                <th>Uygulayan</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.treatment_date} {r.treatment_time || ''}</td>
                  <td><b>{r.patient_name || '-'}</b></td>
                  <td>{r.treatment_type}</td>
                  <td>{r.treatment_name || '-'}</td>
                  <td>{r.route || '-'}</td>
                  <td>{r.dose || '-'}</td>
                  <td>{r.applied_by || '-'}</td>
                  <td>
                    <span className={`pill ${r.status === 'Uygulandı' || r.status === 'Tamamlandı' ? 'ok' : r.status === 'Bekliyor' ? 'warn' : 'danger'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div className="actions" style={{ marginTop: 0 }}>
                      <button className="green" onClick={() => updateStatus(r.id, 'Uygulandı')}>Uygulandı</button>
                      <button className="amber" onClick={() => updateStatus(r.id, 'Bekliyor')}>Bekliyor</button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={9}>Henüz tedavi kaydı yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
