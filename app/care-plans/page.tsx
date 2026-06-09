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
  const [form, setForm] = useState<any>({ patient_id: '', plan_type: '', risk_level: '', goal: '', plan_note: '', responsible: '', review_date: '' });

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
      .from('care_plans')
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

    const { error } = await supabase.from('care_plans').insert(payload);
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
      .from('care_plans')
      .update({ status: 'Tamamlandı', completed_at: new Date().toISOString() })
      .eq('id', id);

    await load();
  }

  return (
    <Shell>
      <div className="hero">
        <h2>Bakım Planı</h2>
        <p>Hasta bazlı bakım hedefi, risk, plan ve takip sorumlusu.</p>
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
            <label>Plan Türü</label>
            <input type="input" value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })} />
          </div>
          <div>
            <label>Risk</label>
            <input type="input" value={form.risk_level} onChange={(e) => setForm({ ...form, risk_level: e.target.value })} />
          </div>
          <div>
            <label>Hedef</label>
            <textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </div>
          <div>
            <label>Plan Notu</label>
            <textarea value={form.plan_note} onChange={(e) => setForm({ ...form, plan_note: e.target.value })} />
          </div>
          <div>
            <label>Sorumlu</label>
            <input type="input" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
          </div>
          <div>
            <label>Gözden Geçirme</label>
            <input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
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
                <th>Plan</th>
                <th>Risk</th>
                <th>Hedef</th>
                <th>Sorumlu</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><b>{row.patient_name || '-'}</b></td>
                  <td>{formatValue(row.plan_type)}</td>
                  <td>{formatValue(row.risk_level)}</td>
                  <td>{formatValue(row.goal)}</td>
                  <td>{formatValue(row.responsible)}</td>
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
