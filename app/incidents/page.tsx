'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = { id: string; facility_id: string; full_name: string };
type Row = Record<string, any>;

function formatValue(value: any) {
  if (!value) return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString('tr-TR');
  }
  return String(value);
}

export default function Page() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<any>({ patient_id: '', incident_at: '', incident_type: '', location: '', severity: '', description: '', status: '' });

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
      setForm((old: any) => ({ ...old, patient_id: old.patient_id || patientRows[0].id }));
    }

    const { data: records } = await supabase
      .from('incident_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    setRows(records || []);
  }

  async function save() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return alert('Hasta seç.');

    const payload: any = {
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
    };

    Object.keys(form).forEach((key) => {
      if (key !== 'patient_id') payload[key] = form[key] || null;
    });

    if (!payload.status) payload.status = 'Aktif';

    const { error } = await supabase.from('incident_records').insert(payload);
    if (error) return alert(error.message);

    setForm((old: any) => {
      const next = { ...old };
      Object.keys(next).forEach((key) => {
        if (key !== 'patient_id') next[key] = '';
      });
      return next;
    });

    await load();
  }

  async function complete(id: string) {
    await supabase
      .from('incident_records')
      .update({ status: 'Tamamlandı', completed_at: new Date().toISOString() })
      .eq('id', id);

    await load();
  }

  return (
    <Shell>
      <div className="hero">
        <h2>Olay / Düşme Kaydı</h2>
        <p>Düşme, yaralanma, kriz ve kurum içi olay kaydı.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Toplam</span><strong>{rows.length}</strong></div>
        <div className="kpi"><span>Aktif</span><strong>{rows.filter((r) => r.status === 'Aktif' || r.status === 'Bekliyor').length}</strong></div>
        <div className="kpi"><span>Tamamlanan</span><strong>{rows.filter((r) => r.status === 'Tamamlandı').length}</strong></div>
        <div className="kpi"><span>Hasta</span><strong>{patients.length}</strong></div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Yeni Kayıt</h2>
            <p>Hasta seçerek kayıt oluştur.</p>
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
            <label>Olay Zamanı</label>
            <input type="datetime-local" value={form.incident_at} onChange={(e) => setForm({ ...form, incident_at: e.target.value })} />
          </div>
          <div>
            <label>Olay Türü</label>
            <input type="input" value={form.incident_type} onChange={(e) => setForm({ ...form, incident_type: e.target.value })} />
          </div>
          <div>
            <label>Yer</label>
            <input type="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label>Şiddet</label>
            <input type="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} />
          </div>
          <div>
            <label>Açıklama</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label>Durum</label>
            <input type="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </div>
        </div>

        <div className="actions">
          <button className="primary" onClick={save}>Kaydet</button>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Kayıtlar</h2>
            <p>Son 200 kayıt</p>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Hasta</th>
                <th>Zaman</th>
                <th>Tür</th>
                <th>Yer</th>
                <th>Şiddet</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><b>{row.patient_name || '-'}</b></td>
                  <td>{formatValue(row.incident_at)}</td>
                  <td>{formatValue(row.incident_type)}</td>
                  <td>{formatValue(row.location)}</td>
                  <td>{formatValue(row.severity)}</td>
                  <td>{formatValue(row.status)}</td>
                  <td>
                    {row.status !== 'Tamamlandı' ? (
                      <button className="green" onClick={() => complete(row.id)}>Tamamla</button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>Kayıt yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
