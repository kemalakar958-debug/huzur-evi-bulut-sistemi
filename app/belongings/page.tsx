'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { applyActiveFacilityFilter, useActiveFacility } from '@/lib/activeFacility';

type Row = Record<string, any>;

export default function BelongingsPage() {
  const ctx = useActiveFacility();
  const [rows, setRows] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [form, setForm] = useState({
    patient_id: '',
    item_group: 'Kıyafet',
    item_type: '',
    item_name: '',
    brand: '',
    model: '',
    color: '',
    size: '',
    quantity: '1',
    status: 'Teslim Alındı',
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

    let belongingsQuery = supabase
      .from('belonging_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    belongingsQuery = applyActiveFacilityFilter(belongingsQuery, ctx);

    const { data: belongingRows } = await belongingsQuery;
    setRows(belongingRows || []);
  }

  async function save() {
    const patient = patients.find((p) => p.id === form.patient_id);

    if (!patient) return alert('Hasta seç.');
    if (!form.item_name && !form.item_type) return alert('Eşya adı/türü yaz.');

    const {
      patient_id,
      ...cleanForm
    } = form;

    const { error } = await supabase.from('belonging_records').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      ...cleanForm,
      quantity: Number(form.quantity || 1),
    });

    if (error) return alert(error.message);

    setForm((old) => ({
      ...old,
      item_type: '',
      item_name: '',
      brand: '',
      model: '',
      color: '',
      size: '',
      quantity: '1',
      note: '',
    }));

    await load();
  }

  return (
    <Shell>
      <div className="hero">
        <h2>Emanet / Kıyafet</h2>
        <p>Aktif kurum filtresine bağlı emanetler.</p>
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
            <label>Grup</label>
            <select value={form.item_group} onChange={(e) => setForm({ ...form, item_group: e.target.value })}>
              <option>Kıyafet</option>
              <option>Değerli Eşya</option>
              <option>Elektronik</option>
              <option>Kişisel Eşya</option>
              <option>Diğer</option>
            </select>
          </div>

          <div>
            <label>Tür</label>
            <input value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })} />
          </div>

          <div>
            <label>Ad</label>
            <input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
          </div>
        </div>

        <div className="grid grid4">
          <div>
            <label>Marka</label>
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>

          <div>
            <label>Model</label>
            <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>

          <div>
            <label>Renk</label>
            <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>

          <div>
            <label>Beden</label>
            <input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          </div>
        </div>

        <div className="grid grid3">
          <div>
            <label>Adet</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>

          <div>
            <label>Durum</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Teslim Alındı</option>
              <option>Odada</option>
              <option>Depoda</option>
              <option>İade Edildi</option>
              <option>Kayıp</option>
            </select>
          </div>

          <div>
            <label>Not</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>

        <div className="actions">
          <button className="primary" onClick={save}>Kaydet</button>
        </div>
      </div>

      <div className="panel">
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Hasta</th>
                <th>Grup</th>
                <th>Tür</th>
                <th>Ad</th>
                <th>Marka/Model</th>
                <th>Renk/Beden</th>
                <th>Adet</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.patient_name}</td>
                  <td>{r.item_group}</td>
                  <td>{r.item_type || '-'}</td>
                  <td>{r.item_name || '-'}</td>
                  <td>{r.brand || '-'} / {r.model || '-'}</td>
                  <td>{r.color || '-'} / {r.size || '-'}</td>
                  <td>{r.quantity || 1}</td>
                  <td>{r.status || '-'}</td>
                </tr>
              ))}

              {rows.length === 0 && <tr><td colSpan={8}>Kayıt yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
