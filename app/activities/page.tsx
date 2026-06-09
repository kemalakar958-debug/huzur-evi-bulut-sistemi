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
  const [form, setForm] = useState<any>({ patient_id: '', activity_at: '', activity_type: '', participation: '', mood: '', social_note: '', status: '' });

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
      .from('activity_records')
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

    const { error } = await supabase.from('activity_records').insert(payload);
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
      .from('activity_records')
      .update({ status: 'Tamamlandı', completed_at: new Date().toISOString() })
      .eq('id', id);

    await load();
  }

  return (
    <Shell>
      <div className="hero">
        <h2>Psikososyal Aktivite Takibi</h2>
        <p>Etkinlik katılımı, moral, sosyal durum ve davranış notları.</p>
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
            <label>Etkinlik Zamanı</label>
            <input type="datetime-local" value={form.activity_at} onChange={(e) => setForm({ ...form, activity_at: e.target.value })} />
          </div>
          <div>
            <label>Etkinlik Türü</label>
            <select value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
              <option value="Müzik">Müzik</option>
              <option value="El işi">El işi</option>
              <option value="Sohbet">Sohbet</option>
              <option value="Oyun">Oyun</option>
              <option value="Bahçe">Bahçe</option>
              <option value="Dini etkinlik">Dini etkinlik</option>
              <option value="Fiziksel aktivite">Fiziksel aktivite</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
          <div>
            <label>Katılım</label>
            <select value={form.participation} onChange={(e) => setForm({ ...form, participation: e.target.value })}>
              <option value="Katıldı">Katıldı</option>
              <option value="Kısmen Katıldı">Kısmen Katıldı</option>
              <option value="Katılmadı">Katılmadı</option>
              <option value="Reddetti">Reddetti</option>
            </select>
          </div>
          <div>
            <label>Moral / Ruh Hali</label>
            <select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}>
              <option value="İyi">İyi</option>
              <option value="Normal">Normal</option>
              <option value="Durgun">Durgun</option>
              <option value="Üzgün">Üzgün</option>
              <option value="Huzursuz">Huzursuz</option>
              <option value="Ajite">Ajite</option>
            </select>
          </div>
          <div>
            <label>Sosyal Not</label>
            <textarea value={form.social_note} onChange={(e) => setForm({ ...form, social_note: e.target.value })} />
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
                <th>Etkinlik</th>
                <th>Katılım</th>
                <th>Moral</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><b>{row.patient_name || '-'}</b></td>
                  <td>{formatValue(row.activity_at)}</td>
                  <td>{formatValue(row.activity_type)}</td>
                  <td>{formatValue(row.participation)}</td>
                  <td>{formatValue(row.mood)}</td>
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
