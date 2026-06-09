'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import AdminGuard from '@/components/AdminGuard';
import { supabase } from '@/lib/supabaseClient';

type Facility = Record<string, any>;

export default function FacilitiesPage() {
  return (
    <Shell>
      <AdminGuard title="Kurumlar / Ayarlar">
        <FacilitiesContent />
      </AdminGuard>
    </Shell>
  );
}

function FacilitiesContent() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selected, setSelected] = useState<Facility | null>(null);
  const [form, setForm] = useState({
    name: '', official_name: '', license_no: '', phone: '', email: '', address: '',
    city: '', district: '', capacity: '', manager_name: '', nurse_responsible: '',
    doctor_name: '', status: 'Aktif', note: ''
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('facilities').select('*').order('name');
    setFacilities(data || []);
    if (data?.[0] && !selected) setSelected(data[0]);
  }

  async function saveFacility() {
    if (!form.name) return alert('Kurum adı zorunlu.');
    const { error } = await supabase.from('facilities').insert({
      ...form,
      capacity: form.capacity ? Number(form.capacity) : null,
    });
    if (error) return alert(error.message);
    setForm({ name: '', official_name: '', license_no: '', phone: '', email: '', address: '', city: '', district: '', capacity: '', manager_name: '', nurse_responsible: '', doctor_name: '', status: 'Aktif', note: '' });
    await load();
    alert('Kurum eklendi.');
  }

  async function updateSelected() {
    if (!selected) return;
    const { error } = await supabase.from('facilities').update({
      name: selected.name,
      official_name: selected.official_name || null,
      license_no: selected.license_no || null,
      phone: selected.phone || null,
      email: selected.email || null,
      address: selected.address || null,
      city: selected.city || null,
      district: selected.district || null,
      capacity: selected.capacity ? Number(selected.capacity) : null,
      manager_name: selected.manager_name || null,
      nurse_responsible: selected.nurse_responsible || null,
      doctor_name: selected.doctor_name || null,
      status: selected.status || 'Aktif',
      note: selected.note || null,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);

    if (error) return alert(error.message);
    await load();
    alert('Kurum ayarları güncellendi.');
  }

  return (
    <>
      <div className="hero">
        <h2>Kurumlar / Ayarlar Paneli</h2>
        <p>Sadece kurucu ve yönetici yetkisi olanlar kurum ekleyebilir ve ayar değiştirebilir.</p>
      </div>

      <div className="grid grid2">
        <div className="panel">
          <div className="panelHead"><div><h2>Yeni Kurum Ekle</h2><p>Şube / kurum kaydı oluştur.</p></div></div>
          <div className="grid grid2">
            <div><label>Kurum Adı</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label>Resmi Ünvan</label><input value={form.official_name} onChange={(e) => setForm({ ...form, official_name: e.target.value })} /></div>
            <div><label>Ruhsat No</label><input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} /></div>
            <div><label>Kapasite</label><input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
            <div><label>Telefon</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label>E-posta</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label>İl</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><label>İlçe</label><input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
          </div>
          <div><label>Adres</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid3">
            <div><label>Müdür</label><input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} /></div>
            <div><label>Sorumlu Hemşire</label><input value={form.nurse_responsible} onChange={(e) => setForm({ ...form, nurse_responsible: e.target.value })} /></div>
            <div><label>Doktor</label><input value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></div>
          </div>
          <div className="actions"><button className="primary" onClick={saveFacility}>Kurum Ekle</button></div>
        </div>

        <div className="panel">
          <div className="panelHead"><div><h2>Kurum Ayarları</h2><p>Seçili kurumun bilgilerini düzenle.</p></div></div>
          <div><label>Kurum Seç</label><select value={selected?.id || ''} onChange={(e) => setSelected(facilities.find((f) => f.id === e.target.value) || null)}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
          {selected && (
            <>
              <div className="grid grid2">
                <div><label>Kurum Adı</label><input value={selected.name || ''} onChange={(e) => setSelected({ ...selected, name: e.target.value })} /></div>
                <div><label>Resmi Ünvan</label><input value={selected.official_name || ''} onChange={(e) => setSelected({ ...selected, official_name: e.target.value })} /></div>
                <div><label>Ruhsat No</label><input value={selected.license_no || ''} onChange={(e) => setSelected({ ...selected, license_no: e.target.value })} /></div>
                <div><label>Kapasite</label><input type="number" value={selected.capacity || ''} onChange={(e) => setSelected({ ...selected, capacity: e.target.value })} /></div>
                <div><label>Telefon</label><input value={selected.phone || ''} onChange={(e) => setSelected({ ...selected, phone: e.target.value })} /></div>
                <div><label>E-posta</label><input value={selected.email || ''} onChange={(e) => setSelected({ ...selected, email: e.target.value })} /></div>
              </div>
              <div><label>Adres</label><input value={selected.address || ''} onChange={(e) => setSelected({ ...selected, address: e.target.value })} /></div>
              <div className="grid grid3">
                <div><label>Müdür</label><input value={selected.manager_name || ''} onChange={(e) => setSelected({ ...selected, manager_name: e.target.value })} /></div>
                <div><label>Sorumlu Hemşire</label><input value={selected.nurse_responsible || ''} onChange={(e) => setSelected({ ...selected, nurse_responsible: e.target.value })} /></div>
                <div><label>Doktor</label><input value={selected.doctor_name || ''} onChange={(e) => setSelected({ ...selected, doctor_name: e.target.value })} /></div>
              </div>
              <div><label>Not</label><input value={selected.note || ''} onChange={(e) => setSelected({ ...selected, note: e.target.value })} /></div>
              <div className="actions"><button className="primary" onClick={updateSelected}>Ayarları Kaydet</button></div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
