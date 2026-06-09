'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Facility = { id: string; name: string };
type Room = Record<string, any>;

export default function RoomsPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState({
    facility_id: '',
    floor_no: '',
    room_no: '',
    bed_no: '',
    bed_status: 'Boş',
    patient_name: '',
    note: '',
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: f } = await supabase.from('facilities').select('*').order('name');
    setFacilities(f || []);
    if (f?.[0]) setForm((old) => ({ ...old, facility_id: old.facility_id || f[0].id }));

    const { data: r } = await supabase
      .from('room_bed_records')
      .select('*')
      .order('floor_no')
      .order('room_no')
      .order('bed_no');

    setRooms(r || []);
  }

  async function saveRoom() {
    if (!form.facility_id || !form.room_no || !form.bed_no) return alert('Kurum, oda ve yatak zorunlu.');

    const { error } = await supabase.from('room_bed_records').insert(form);
    if (error) return alert(error.message);

    setForm((old) => ({ ...old, floor_no: '', room_no: '', bed_no: '', bed_status: 'Boş', patient_name: '', note: '' }));
    await load();
  }

  async function setStatus(id: string, bed_status: string) {
    await supabase.from('room_bed_records').update({ bed_status }).eq('id', id);
    await load();
  }

  const empty = rooms.filter((r) => r.bed_status === 'Boş').length;
  const full = rooms.filter((r) => r.bed_status === 'Dolu').length;
  const reserved = rooms.filter((r) => r.bed_status === 'Rezerve').length;

  return (
    <Shell>
      <div className="hero">
        <h2>Oda / Yatak Yönetimi</h2>
        <p>Boş yatak, dolu yatak, rezerve yatak ve oda yerleşim takibi.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Toplam Yatak</span><strong>{rooms.length}</strong></div>
        <div className="kpi"><span>Boş</span><strong>{empty}</strong></div>
        <div className="kpi"><span>Dolu</span><strong>{full}</strong></div>
        <div className="kpi"><span>Rezerve</span><strong>{reserved}</strong></div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Yatak Kaydı Ekle</h2>
            <p>Kurum içi oda ve yatak envanteri.</p>
          </div>
        </div>

        <div className="grid grid4">
          <div>
            <label>Kurum</label>
            <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value })}>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div><label>Kat</label><input value={form.floor_no} onChange={(e) => setForm({ ...form, floor_no: e.target.value })} /></div>
          <div><label>Oda</label><input value={form.room_no} onChange={(e) => setForm({ ...form, room_no: e.target.value })} /></div>
          <div><label>Yatak</label><input value={form.bed_no} onChange={(e) => setForm({ ...form, bed_no: e.target.value })} /></div>
        </div>

        <div className="grid grid3">
          <div>
            <label>Durum</label>
            <select value={form.bed_status} onChange={(e) => setForm({ ...form, bed_status: e.target.value })}>
              <option>Boş</option>
              <option>Dolu</option>
              <option>Rezerve</option>
              <option>Bakımda</option>
            </select>
          </div>
          <div><label>Hasta Adı</label><input value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} /></div>
          <div><label>Not</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        </div>

        <div className="actions">
          <button className="primary" onClick={saveRoom}>Kaydet</button>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Oda / Yatak Listesi</h2>
            <p>{rooms.length} yatak</p>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Kat</th>
                <th>Oda</th>
                <th>Yatak</th>
                <th>Durum</th>
                <th>Hasta</th>
                <th>Not</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td>{r.floor_no || '-'}</td>
                  <td>{r.room_no || '-'}</td>
                  <td>{r.bed_no || '-'}</td>
                  <td><span className={`pill ${r.bed_status === 'Boş' ? 'ok' : r.bed_status === 'Dolu' ? 'danger' : 'warn'}`}>{r.bed_status}</span></td>
                  <td>{r.patient_name || '-'}</td>
                  <td>{r.note || '-'}</td>
                  <td>
                    <div className="actions" style={{ marginTop: 0 }}>
                      <button className="green" onClick={() => setStatus(r.id, 'Boş')}>Boş</button>
                      <button className="red" onClick={() => setStatus(r.id, 'Dolu')}>Dolu</button>
                      <button className="amber" onClick={() => setStatus(r.id, 'Rezerve')}>Rezerve</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rooms.length === 0 && (
                <tr><td colSpan={7}>Yatak kaydı yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
