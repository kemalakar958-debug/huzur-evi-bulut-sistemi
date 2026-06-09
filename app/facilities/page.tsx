'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Facility = Record<string, any>;

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selected, setSelected] = useState<Facility | null>(null);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [form, setForm] = useState({
    name: '',
    official_name: '',
    license_no: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    district: '',
    capacity: '',
    manager_name: '',
    nurse_responsible: '',
    doctor_name: '',
    status: 'Aktif',
    note: '',
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('facilities').select('*').order('name');
    setFacilities(data || []);
    if (data?.[0] && !selected) setSelected(data[0]);
    await loadStats(data || []);
  }

  async function loadStats(list: Facility[]) {
    const next: Record<string, any> = {};
    for (const facility of list) {
      const id = facility.id;
      const [patients, meds, depot, docs, tasks, treatments] = await Promise.all([
        countByFacility('patients', id),
        countByFacility('medications', id),
        countByFacility('depot_items', id),
        countByFacility('documents', id),
        countByFacility('care_tasks', id),
        countByFacility('treatment_records', id),
      ]);

      next[id] = { patients, meds, depot, docs, tasks, treatments };
    }
    setStats(next);
  }

  async function countByFacility(table: string, facilityId: string) {
    try {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facilityId);

      return count || 0;
    } catch {
      return 0;
    }
  }

  async function saveFacility() {
    if (!form.name) return alert('Kurum adı zorunlu.');

    const payload = {
      name: form.name,
      official_name: form.official_name || null,
      license_no: form.license_no || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      district: form.district || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      manager_name: form.manager_name || null,
      nurse_responsible: form.nurse_responsible || null,
      doctor_name: form.doctor_name || null,
      status: form.status,
      note: form.note || null,
    };

    const { error } = await supabase.from('facilities').insert(payload);
    if (error) return alert(error.message);

    setForm({
      name: '',
      official_name: '',
      license_no: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      district: '',
      capacity: '',
      manager_name: '',
      nurse_responsible: '',
      doctor_name: '',
      status: 'Aktif',
      note: '',
    });

    await load();
    alert('Kurum eklendi.');
  }

  async function updateSelected() {
    if (!selected) return;

    const { error } = await supabase
      .from('facilities')
      .update({
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
      })
      .eq('id', selected.id);

    if (error) return alert(error.message);
    await load();
    alert('Kurum ayarları güncellendi.');
  }

  async function setFacilityStatus(id: string, status: string) {
    const { error } = await supabase.from('facilities').update({ status }).eq('id', id);
    if (error) return alert(error.message);
    await load();
  }

  const totalCapacity = facilities.reduce((sum, f) => sum + Number(f.capacity || 0), 0);
  const totalPatients = Object.values(stats).reduce((sum: number, s: any) => sum + Number(s.patients || 0), 0);
  const activeFacilities = facilities.filter((f) => f.status !== 'Pasif').length;

  return (
    <Shell>
      <div className="hero">
        <h2>Kurumlar / Ayarlar Paneli</h2>
        <p>Sınırsız kurum ekle, her kurumun ayarını ve operasyon özetini ayrı yönet.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Toplam Kurum</span><strong>{facilities.length}</strong></div>
        <div className="kpi"><span>Aktif Kurum</span><strong>{activeFacilities}</strong></div>
        <div className="kpi"><span>Toplam Kapasite</span><strong>{totalCapacity}</strong></div>
        <div className="kpi"><span>Toplam Hasta</span><strong>{totalPatients}</strong></div>
      </div>

      <div className="grid grid2">
        <div className="panel">
          <div className="panelHead">
            <div>
              <h2>Yeni Kurum Ekle</h2>
              <p>Şube / kurum kaydı oluştur.</p>
            </div>
          </div>

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

          <div className="grid grid2">
            <div>
              <label>Durum</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Aktif</option>
                <option>Pasif</option>
                <option>Hazırlık</option>
              </select>
            </div>
            <div><label>Not</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </div>

          <div className="actions">
            <button className="primary" onClick={saveFacility}>Kurum Ekle</button>
          </div>
        </div>

        <div className="panel">
          <div className="panelHead">
            <div>
              <h2>Kurum Ayarları</h2>
              <p>Seçili kurumun bilgilerini düzenle.</p>
            </div>
          </div>

          <div>
            <label>Kurum Seç</label>
            <select value={selected?.id || ''} onChange={(e) => setSelected(facilities.find((f) => f.id === e.target.value) || null)}>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {selected && (
            <>
              <div className="grid grid2">
                <div><label>Kurum Adı</label><input value={selected.name || ''} onChange={(e) => setSelected({ ...selected, name: e.target.value })} /></div>
                <div><label>Resmi Ünvan</label><input value={selected.official_name || ''} onChange={(e) => setSelected({ ...selected, official_name: e.target.value })} /></div>
                <div><label>Ruhsat No</label><input value={selected.license_no || ''} onChange={(e) => setSelected({ ...selected, license_no: e.target.value })} /></div>
                <div><label>Kapasite</label><input type="number" value={selected.capacity || ''} onChange={(e) => setSelected({ ...selected, capacity: e.target.value })} /></div>
                <div><label>Telefon</label><input value={selected.phone || ''} onChange={(e) => setSelected({ ...selected, phone: e.target.value })} /></div>
                <div><label>E-posta</label><input value={selected.email || ''} onChange={(e) => setSelected({ ...selected, email: e.target.value })} /></div>
                <div><label>İl</label><input value={selected.city || ''} onChange={(e) => setSelected({ ...selected, city: e.target.value })} /></div>
                <div><label>İlçe</label><input value={selected.district || ''} onChange={(e) => setSelected({ ...selected, district: e.target.value })} /></div>
              </div>

              <div><label>Adres</label><input value={selected.address || ''} onChange={(e) => setSelected({ ...selected, address: e.target.value })} /></div>

              <div className="grid grid3">
                <div><label>Müdür</label><input value={selected.manager_name || ''} onChange={(e) => setSelected({ ...selected, manager_name: e.target.value })} /></div>
                <div><label>Sorumlu Hemşire</label><input value={selected.nurse_responsible || ''} onChange={(e) => setSelected({ ...selected, nurse_responsible: e.target.value })} /></div>
                <div><label>Doktor</label><input value={selected.doctor_name || ''} onChange={(e) => setSelected({ ...selected, doctor_name: e.target.value })} /></div>
              </div>

              <div className="grid grid2">
                <div>
                  <label>Durum</label>
                  <select value={selected.status || 'Aktif'} onChange={(e) => setSelected({ ...selected, status: e.target.value })}>
                    <option>Aktif</option>
                    <option>Pasif</option>
                    <option>Hazırlık</option>
                  </select>
                </div>
                <div><label>Not</label><input value={selected.note || ''} onChange={(e) => setSelected({ ...selected, note: e.target.value })} /></div>
              </div>

              <div className="actions">
                <button className="primary" onClick={updateSelected}>Ayarları Kaydet</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Kurumlar Operasyon Özeti</h2>
            <p>Her kurumun hasta, ilaç, evrak, depo ve görev sayıları.</p>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Kurum</th>
                <th>Durum</th>
                <th>Kapasite</th>
                <th>Hasta</th>
                <th>İlaç</th>
                <th>Tedavi</th>
                <th>Depo</th>
                <th>Evrak</th>
                <th>Görev</th>
                <th>Yönetim</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((facility) => {
                const s = stats[facility.id] || {};
                return (
                  <tr key={facility.id}>
                    <td><b>{facility.name}</b><br /><small>{facility.city || '-'} / {facility.district || '-'}</small></td>
                    <td><span className={`pill ${facility.status === 'Aktif' ? 'ok' : facility.status === 'Pasif' ? 'danger' : 'warn'}`}>{facility.status || 'Aktif'}</span></td>
                    <td>{facility.capacity || '-'}</td>
                    <td>{s.patients || 0}</td>
                    <td>{s.meds || 0}</td>
                    <td>{s.treatments || 0}</td>
                    <td>{s.depot || 0}</td>
                    <td>{s.docs || 0}</td>
                    <td>{s.tasks || 0}</td>
                    <td>
                      <div className="actions" style={{ marginTop: 0 }}>
                        <button className="green" onClick={() => setFacilityStatus(facility.id, 'Aktif')}>Aktif</button>
                        <button className="red" onClick={() => setFacilityStatus(facility.id, 'Pasif')}>Pasif</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {facilities.length === 0 && <tr><td colSpan={10}>Kurum yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
