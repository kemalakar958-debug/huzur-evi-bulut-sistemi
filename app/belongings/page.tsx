'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = { id: string; facility_id: string; full_name: string };
type Item = Record<string, any>;

export default function BelongingsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    patient_id: '',
    item_group: 'Kıyafet',
    item_type: '',
    item_name: '',
    brand: '',
    model: '',
    color: '',
    size: '',
    serial_no: '',
    quantity: '1',
    condition_status: 'İyi',
    storage_location: '',
    delivered_by: '',
    received_by: '',
    status: 'Teslim Alındı',
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

    await loadItems();
  }

  async function loadItems() {
    const { data } = await supabase
      .from('belonging_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    setItems(data || []);
  }

  function safeFileName(name: string) {
    return name.replaceAll(' ', '_').replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_.-]/g, '').toLowerCase();
  }

  async function uploadPhoto(patient: Patient) {
    if (!file) return null;

    const path = `${patient.facility_id}/${patient.id}/${Date.now()}_${safeFileName(file.name)}`;

    const { error } = await supabase.storage
      .from('belonging-photos')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;
    return path;
  }

  async function saveItem() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return alert('Hasta seç.');
    if (!form.item_name && !form.item_type) return alert('Eşya/kıyafet adı veya türü yaz.');

    setSaving(true);

    try {
      const photoPath = await uploadPhoto(patient);

      const { error } = await supabase.from('belonging_records').insert({
        facility_id: patient.facility_id,
        patient_id: patient.id,
        patient_name: patient.full_name,
        item_group: form.item_group,
        item_type: form.item_type || null,
        item_name: form.item_name || null,
        brand: form.brand || null,
        model: form.model || null,
        color: form.color || null,
        size: form.size || null,
        serial_no: form.serial_no || null,
        quantity: Number(form.quantity || 1),
        condition_status: form.condition_status,
        storage_location: form.storage_location || null,
        delivered_by: form.delivered_by || null,
        received_by: form.received_by || null,
        status: form.status,
        note: form.note || null,
        photo_path: photoPath,
      });

      if (error) return alert(error.message);

      setFile(null);
      setForm((old) => ({
        ...old,
        item_type: '',
        item_name: '',
        brand: '',
        model: '',
        color: '',
        size: '',
        serial_no: '',
        quantity: '1',
        storage_location: '',
        delivered_by: '',
        received_by: '',
        status: 'Teslim Alındı',
        note: '',
      }));

      await loadItems();
      alert('Emanet/kıyafet kaydı oluşturuldu.');
    } catch (err: any) {
      alert('Kayıt hatası: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function openPhoto(path: string | null) {
    if (!path) return alert('Bu kayıtta fotoğraf yok.');

    const { data, error } = await supabase.storage
      .from('belonging-photos')
      .createSignedUrl(path, 60 * 10);

    if (error) return alert(error.message);
    window.open(data.signedUrl, '_blank');
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('belonging_records')
      .update({ status, returned_at: status === 'İade Edildi' ? new Date().toISOString() : null })
      .eq('id', id);

    if (error) return alert(error.message);
    await loadItems();
  }

  const active = items.filter((x) => x.status !== 'İade Edildi').length;
  const clothing = items.filter((x) => x.item_group === 'Kıyafet').length;
  const returned = items.filter((x) => x.status === 'İade Edildi').length;
  const lost = items.filter((x) => x.status === 'Kayıp').length;

  return (
    <Shell>
      <div className="hero">
        <h2>Emanet Eşya / Kıyafet Envanteri</h2>
        <p>Fotoğraf, marka, model, renk, beden, seri no, teslim ve iade takibi.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Aktif Emanet</span><strong>{active}</strong></div>
        <div className="kpi"><span>Kıyafet</span><strong>{clothing}</strong></div>
        <div className="kpi"><span>İade Edildi</span><strong>{returned}</strong></div>
        <div className="kpi"><span>Kayıp</span><strong>{lost}</strong></div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Yeni Emanet / Kıyafet Kaydı</h2>
            <p>Fotoğraf, model ve detay bilgilerini kaydet.</p>
          </div>
        </div>

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
              <option>Medikal Cihaz</option>
              <option>Kişisel Eşya</option>
              <option>Diğer</option>
            </select>
          </div>

          <div><label>Tür</label><input value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })} placeholder="Mont, pantolon, telefon..." /></div>
          <div><label>Ad / Açıklama</label><input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} /></div>
        </div>

        <div className="grid grid4">
          <div><label>Marka</label><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
          <div><label>Model</label><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
          <div><label>Renk</label><input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
          <div><label>Beden</label><input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} /></div>
        </div>

        <div className="grid grid4">
          <div><label>Seri No / IMEI</label><input value={form.serial_no} onChange={(e) => setForm({ ...form, serial_no: e.target.value })} /></div>
          <div><label>Adet</label><input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
          <div>
            <label>Kondisyon</label>
            <select value={form.condition_status} onChange={(e) => setForm({ ...form, condition_status: e.target.value })}>
              <option>Yeni</option>
              <option>İyi</option>
              <option>Orta</option>
              <option>Yıpranmış</option>
              <option>Hasarlı</option>
            </select>
          </div>
          <div><label>Saklama Yeri</label><input value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} /></div>
        </div>

        <div className="grid grid4">
          <div><label>Teslim Eden</label><input value={form.delivered_by} onChange={(e) => setForm({ ...form, delivered_by: e.target.value })} /></div>
          <div><label>Teslim Alan</label><input value={form.received_by} onChange={(e) => setForm({ ...form, received_by: e.target.value })} /></div>
          <div>
            <label>Durum</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Teslim Alındı</option>
              <option>Kurumda</option>
              <option>Kullanımda</option>
              <option>Yıkamada</option>
              <option>Kayıp</option>
              <option>İade Edildi</option>
            </select>
          </div>
          <div><label>Fotoğraf</label><input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
        </div>

        <div><label>Not</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        {file && <div className="notice">Seçilen fotoğraf: <b>{file.name}</b></div>}

        <div className="actions">
          <button className="primary" onClick={saveItem} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Emanet / Kıyafet Kaydet'}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Emanet / Kıyafet Listesi</h2>
            <p>Son 500 kayıt</p>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Hasta</th><th>Grup</th><th>Tür</th><th>Ad</th><th>Marka/Model</th><th>Renk/Beden</th><th>Adet</th><th>Durum</th><th>Foto</th><th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><b>{item.patient_name || '-'}</b></td>
                  <td>{item.item_group}</td>
                  <td>{item.item_type || '-'}</td>
                  <td>{item.item_name || '-'}</td>
                  <td>{item.brand || '-'} / {item.model || '-'}</td>
                  <td>{item.color || '-'} / {item.size || '-'}</td>
                  <td>{item.quantity || 1}</td>
                  <td><span className={`pill ${item.status === 'İade Edildi' ? 'ok' : item.status === 'Kayıp' ? 'danger' : 'warn'}`}>{item.status}</span></td>
                  <td>{item.photo_path ? <button className="soft" onClick={() => openPhoto(item.photo_path)}>Aç</button> : '-'}</td>
                  <td>
                    <div className="actions" style={{ marginTop: 0 }}>
                      <button className="green" onClick={() => updateStatus(item.id, 'Kurumda')}>Kurumda</button>
                      <button className="amber" onClick={() => updateStatus(item.id, 'Yıkamada')}>Yıkamada</button>
                      <button className="red" onClick={() => updateStatus(item.id, 'Kayıp')}>Kayıp</button>
                      <button className="soft" onClick={() => updateStatus(item.id, 'İade Edildi')}>İade</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={10}>Kayıt yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
