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
  const [form, setForm] = useState<any>({ patient_id: '', record_at: '', behavior_type: '', severity: '', trigger_note: '', intervention: '', status: '' });

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
      .from('behavior_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

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

    const { error } = await supabase.from('behavior_records').insert(payload);
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
      .from('behavior_records')
      .update({ status: 'Tamamlandı', completed_at: new Date().toISOString() })
      .eq('id', id);

    await load();
  }

  return (
    <Shell>
      <div className="hero">
        <h2>Davranış / Ruhsal Durum Takibi</h2>
        <p>Ajitasyon, konfüzyon, saldırganlık, depresif görünüm ve davranış notları.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Toplam</span><strong>{rows.length}</strong></div>
        <div className="kpi"><span>Aktif</span><strong>{rows.filter((r) => r.status === 'Aktif' || r.status === 'Bekliyor' || r.status === 'Takip').length}</strong></div>
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
            <label>Zaman</label>
            <input type="datetime-local" value={form.record_at} onChange={(e) => setForm({ ...form, record_at: e.target.value })} />
          </div>
          <div>
            <label>Davranış</label>
            <select value={form.behavior_type} onChange={(e) => setForm({ ...form, behavior_type: e.target.value })}>
              <option value="Normal">Normal</option>
              <option value="Ajitasyon">Ajitasyon</option>
              <option value="Konfüzyon">Konfüzyon</option>
              <option value="Saldırganlık">Saldırganlık</option>
              <option value="Depresif görünüm">Depresif görünüm</option>
              <option value="Ağlama">Ağlama</option>
              <option value="İçe kapanma">İçe kapanma</option>
              <option value="Kaçma eğilimi">Kaçma eğilimi</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
          <div>
            <label>Şiddet</label>
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              <option value="Hafif">Hafif</option>
              <option value="Orta">Orta</option>
              <option value="Ciddi">Ciddi</option>
              <option value="Kritik">Kritik</option>
            </select>
          </div>
          <div>
            <label>Tetikleyen Durum</label>
            <textarea value={form.trigger_note} onChange={(e) => setForm({ ...form, trigger_note: e.target.value })} />
          </div>
          <div>
            <label>Müdahale</label>
            <textarea value={form.intervention} onChange={(e) => setForm({ ...form, intervention: e.target.value })} />
          </div>
          <div>
            <label>Durum</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Aktif">Aktif</option>
              <option value="Takip">Takip</option>
              <option value="Tamamlandı">Tamamlandı</option>
            </select>
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
            <p>Son 300 kayıt</p>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Hasta</th>
                <th>Zaman</th>
                <th>Davranış</th>
                <th>Şiddet</th>
                <th>Durum</th>
                <th>Müdahale</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><b>{row.patient_name || '-'}</b></td>
                  <td>{formatValue(row.record_at)}</td>
                  <td>{formatValue(row.behavior_type)}</td>
                  <td>{formatValue(row.severity)}</td>
                  <td>{formatValue(row.status)}</td>
                  <td>{formatValue(row.intervention)}</td>
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
