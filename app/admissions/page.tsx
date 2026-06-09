'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Facility = { id: string; name: string };
type Patient = { id: string; facility_id: string; full_name: string; room_no?: string; bed_no?: string };
type RecordRow = Record<string, any>;

export default function AdmissionsPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [admissions, setAdmissions] = useState<RecordRow[]>([]);
  const [exits, setExits] = useState<RecordRow[]>([]);
  const [tab, setTab] = useState<'admission' | 'exit'>('admission');

  const [admissionForm, setAdmissionForm] = useState({
    facility_id: '',
    patient_id: '',
    admission_date: new Date().toISOString().slice(0, 10),
    admission_type: 'Yeni Kabul',
    room_no: '',
    bed_no: '',
    brought_by: '',
    relation: '',
    initial_condition: '',
    diagnosis_summary: '',
    allergy_note: '',
    medication_note: '',
    belongings_checked: 'Hayır',
    documents_checked: 'Hayır',
    consent_checked: 'Hayır',
    status: 'Aktif',
    note: '',
  });

  const [exitForm, setExitForm] = useState({
    patient_id: '',
    exit_date: new Date().toISOString().slice(0, 10),
    exit_type: 'Taburcu',
    destination: '',
    taken_by: '',
    relation: '',
    reason: '',
    belongings_returned: 'Hayır',
    documents_returned: 'Hayır',
    archive_status: 'Arşive Alınacak',
    death_time: '',
    death_place: '',
    death_doctor: '',
    death_note: '',
    note: '',
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: f } = await supabase.from('facilities').select('*').order('name');
    setFacilities(f || []);

    const { data: p } = await supabase.from('patients').select('id, facility_id, full_name, room_no, bed_no').order('full_name');
    setPatients(p || []);

    if (f?.[0]) {
      setAdmissionForm((old) => ({ ...old, facility_id: old.facility_id || f[0].id }));
    }

    if (p?.[0]) {
      setAdmissionForm((old) => ({ ...old, patient_id: old.patient_id || p[0].id }));
      setExitForm((old) => ({ ...old, patient_id: old.patient_id || p[0].id }));
    }

    const { data: a } = await supabase.from('admission_records').select('*').order('created_at', { ascending: false }).limit(300);
    setAdmissions(a || []);

    const { data: e } = await supabase.from('exit_records').select('*').order('created_at', { ascending: false }).limit(300);
    setExits(e || []);
  }

  async function saveAdmission() {
    const patient = patients.find((p) => p.id === admissionForm.patient_id);

    const payload = {
      ...admissionForm,
      patient_name: patient?.full_name || null,
    };

    const { error } = await supabase.from('admission_records').insert(payload);
    if (error) return alert(error.message);

    if (patient) {
      await supabase
        .from('patients')
        .update({
          status: 'Aktif',
          room_no: admissionForm.room_no || patient.room_no || null,
          bed_no: admissionForm.bed_no || patient.bed_no || null,
        })
        .eq('id', patient.id);
    }

    setAdmissionForm((old) => ({
      ...old,
      admission_date: new Date().toISOString().slice(0, 10),
      brought_by: '',
      relation: '',
      initial_condition: '',
      diagnosis_summary: '',
      allergy_note: '',
      medication_note: '',
      belongings_checked: 'Hayır',
      documents_checked: 'Hayır',
      consent_checked: 'Hayır',
      note: '',
    }));

    await load();
    alert('Hasta kabul kaydı oluşturuldu.');
  }

  async function saveExit() {
    const patient = patients.find((p) => p.id === exitForm.patient_id);
    if (!patient) return alert('Hasta seç.');

    const { error } = await supabase.from('exit_records').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      ...exitForm,
    });

    if (error) return alert(error.message);

    const nextStatus =
      exitForm.exit_type === 'Vefat'
        ? 'Vefat'
        : exitForm.exit_type === 'Nakil'
          ? 'Nakil'
          : 'Taburcu';

    await supabase
      .from('patients')
      .update({ status: nextStatus })
      .eq('id', patient.id);

    setExitForm((old) => ({
      ...old,
      exit_date: new Date().toISOString().slice(0, 10),
      destination: '',
      taken_by: '',
      relation: '',
      reason: '',
      belongings_returned: 'Hayır',
      documents_returned: 'Hayır',
      archive_status: 'Arşive Alınacak',
      death_time: '',
      death_place: '',
      death_doctor: '',
      death_note: '',
      note: '',
    }));

    await load();
    alert('Ayrılış / vefat kaydı oluşturuldu.');
  }

  const activeAdmissions = admissions.filter((x) => x.status === 'Aktif').length;
  const deaths = exits.filter((x) => x.exit_type === 'Vefat').length;
  const transfers = exits.filter((x) => x.exit_type === 'Nakil').length;
  const discharged = exits.filter((x) => x.exit_type === 'Taburcu').length;

  return (
    <Shell>
      <div className="hero">
        <h2>Hasta Kabul / Ayrılış / Vefat / Arşiv</h2>
        <p>Kuruma giriş, oda yerleşim, taburcu, nakil, vefat ve arşiv süreci.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Aktif Kabul</span><strong>{activeAdmissions}</strong></div>
        <div className="kpi"><span>Taburcu</span><strong>{discharged}</strong></div>
        <div className="kpi"><span>Nakil</span><strong>{transfers}</strong></div>
        <div className="kpi"><span>Vefat</span><strong>{deaths}</strong></div>
      </div>

      <div className="panel">
        <div className="actions" style={{ marginTop: 0 }}>
          <button className={tab === 'admission' ? 'primary' : 'soft'} onClick={() => setTab('admission')}>Hasta Kabul</button>
          <button className={tab === 'exit' ? 'primary' : 'soft'} onClick={() => setTab('exit')}>Ayrılış / Taburcu / Vefat</button>
        </div>
      </div>

      {tab === 'admission' && (
        <div className="panel">
          <div className="panelHead">
            <div>
              <h2>Yeni Hasta Kabul Kaydı</h2>
              <p>Kabul, oda yerleşim ve ilk değerlendirme kontrolü.</p>
            </div>
          </div>

          <div className="grid grid4">
            <div>
              <label>Kurum</label>
              <select value={admissionForm.facility_id} onChange={(e) => setAdmissionForm({ ...admissionForm, facility_id: e.target.value })}>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            <div>
              <label>Hasta</label>
              <select value={admissionForm.patient_id} onChange={(e) => setAdmissionForm({ ...admissionForm, patient_id: e.target.value })}>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>

            <div><label>Kabul Tarihi</label><input type="date" value={admissionForm.admission_date} onChange={(e) => setAdmissionForm({ ...admissionForm, admission_date: e.target.value })} /></div>

            <div>
              <label>Kabul Türü</label>
              <select value={admissionForm.admission_type} onChange={(e) => setAdmissionForm({ ...admissionForm, admission_type: e.target.value })}>
                <option>Yeni Kabul</option>
                <option>Nakilden Geliş</option>
                <option>Hastaneden Dönüş</option>
                <option>Geçici Kabul</option>
              </select>
            </div>
          </div>

          <div className="grid grid4">
            <div><label>Oda</label><input value={admissionForm.room_no} onChange={(e) => setAdmissionForm({ ...admissionForm, room_no: e.target.value })} /></div>
            <div><label>Yatak</label><input value={admissionForm.bed_no} onChange={(e) => setAdmissionForm({ ...admissionForm, bed_no: e.target.value })} /></div>
            <div><label>Getiren Kişi</label><input value={admissionForm.brought_by} onChange={(e) => setAdmissionForm({ ...admissionForm, brought_by: e.target.value })} /></div>
            <div><label>Yakınlık</label><input value={admissionForm.relation} onChange={(e) => setAdmissionForm({ ...admissionForm, relation: e.target.value })} /></div>
          </div>

          <div className="grid grid2">
            <div><label>İlk Durum / Genel Gözlem</label><textarea value={admissionForm.initial_condition} onChange={(e) => setAdmissionForm({ ...admissionForm, initial_condition: e.target.value })} /></div>
            <div><label>Tanı / Sağlık Özeti</label><textarea value={admissionForm.diagnosis_summary} onChange={(e) => setAdmissionForm({ ...admissionForm, diagnosis_summary: e.target.value })} /></div>
          </div>

          <div className="grid grid2">
            <div><label>Alerji Notu</label><input value={admissionForm.allergy_note} onChange={(e) => setAdmissionForm({ ...admissionForm, allergy_note: e.target.value })} /></div>
            <div><label>İlaç Notu</label><input value={admissionForm.medication_note} onChange={(e) => setAdmissionForm({ ...admissionForm, medication_note: e.target.value })} /></div>
          </div>

          <div className="grid grid4">
            <div>
              <label>Emanet Kontrol</label>
              <select value={admissionForm.belongings_checked} onChange={(e) => setAdmissionForm({ ...admissionForm, belongings_checked: e.target.value })}>
                <option>Hayır</option><option>Evet</option>
              </select>
            </div>
            <div>
              <label>Evrak Kontrol</label>
              <select value={admissionForm.documents_checked} onChange={(e) => setAdmissionForm({ ...admissionForm, documents_checked: e.target.value })}>
                <option>Hayır</option><option>Evet</option>
              </select>
            </div>
            <div>
              <label>Onam / Sözleşme</label>
              <select value={admissionForm.consent_checked} onChange={(e) => setAdmissionForm({ ...admissionForm, consent_checked: e.target.value })}>
                <option>Hayır</option><option>Evet</option>
              </select>
            </div>
            <div><label>Not</label><input value={admissionForm.note} onChange={(e) => setAdmissionForm({ ...admissionForm, note: e.target.value })} /></div>
          </div>

          <div className="actions">
            <button className="primary" onClick={saveAdmission}>Hasta Kabul Kaydet</button>
          </div>
        </div>
      )}

      {tab === 'exit' && (
        <div className="panel">
          <div className="panelHead">
            <div>
              <h2>Ayrılış / Taburcu / Vefat Kaydı</h2>
              <p>Hasta çıkış, nakil, vefat ve arşiv kaydı.</p>
            </div>
          </div>

          <div className="grid grid4">
            <div>
              <label>Hasta</label>
              <select value={exitForm.patient_id} onChange={(e) => setExitForm({ ...exitForm, patient_id: e.target.value })}>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>

            <div><label>Ayrılış Tarihi</label><input type="date" value={exitForm.exit_date} onChange={(e) => setExitForm({ ...exitForm, exit_date: e.target.value })} /></div>

            <div>
              <label>Ayrılış Türü</label>
              <select value={exitForm.exit_type} onChange={(e) => setExitForm({ ...exitForm, exit_type: e.target.value })}>
                <option>Taburcu</option>
                <option>Nakil</option>
                <option>Vefat</option>
                <option>Kendi İsteğiyle Ayrılış</option>
                <option>Geçici Ayrılış</option>
              </select>
            </div>

            <div><label>Gideceği Yer / Kurum</label><input value={exitForm.destination} onChange={(e) => setExitForm({ ...exitForm, destination: e.target.value })} /></div>
          </div>

          <div className="grid grid4">
            <div><label>Teslim Alan / Götüren</label><input value={exitForm.taken_by} onChange={(e) => setExitForm({ ...exitForm, taken_by: e.target.value })} /></div>
            <div><label>Yakınlık</label><input value={exitForm.relation} onChange={(e) => setExitForm({ ...exitForm, relation: e.target.value })} /></div>
            <div>
              <label>Emanet İade</label>
              <select value={exitForm.belongings_returned} onChange={(e) => setExitForm({ ...exitForm, belongings_returned: e.target.value })}>
                <option>Hayır</option><option>Evet</option><option>Kısmi</option>
              </select>
            </div>
            <div>
              <label>Evrak İade</label>
              <select value={exitForm.documents_returned} onChange={(e) => setExitForm({ ...exitForm, documents_returned: e.target.value })}>
                <option>Hayır</option><option>Evet</option><option>Kısmi</option>
              </select>
            </div>
          </div>

          <div className="grid grid2">
            <div><label>Ayrılış Nedeni</label><textarea value={exitForm.reason} onChange={(e) => setExitForm({ ...exitForm, reason: e.target.value })} /></div>
            <div><label>Not</label><textarea value={exitForm.note} onChange={(e) => setExitForm({ ...exitForm, note: e.target.value })} /></div>
          </div>

          {exitForm.exit_type === 'Vefat' && (
            <>
              <div className="notice"><b>Vefat bilgileri</b> alanını doldur.</div>
              <div className="grid grid4">
                <div><label>Vefat Saati</label><input type="time" value={exitForm.death_time} onChange={(e) => setExitForm({ ...exitForm, death_time: e.target.value })} /></div>
                <div><label>Vefat Yeri</label><input value={exitForm.death_place} onChange={(e) => setExitForm({ ...exitForm, death_place: e.target.value })} /></div>
                <div><label>Doktor</label><input value={exitForm.death_doctor} onChange={(e) => setExitForm({ ...exitForm, death_doctor: e.target.value })} /></div>
                <div><label>Vefat Notu</label><input value={exitForm.death_note} onChange={(e) => setExitForm({ ...exitForm, death_note: e.target.value })} /></div>
              </div>
            </>
          )}

          <div>
            <label>Arşiv Durumu</label>
            <select value={exitForm.archive_status} onChange={(e) => setExitForm({ ...exitForm, archive_status: e.target.value })}>
              <option>Arşive Alınacak</option>
              <option>Arşive Alındı</option>
              <option>Eksik Evrak Var</option>
              <option>Beklemede</option>
            </select>
          </div>

          <div className="actions">
            <button className="red" onClick={saveExit}>Ayrılış / Vefat Kaydet</button>
          </div>
        </div>
      )}

      <div className="grid grid2">
        <div className="panel">
          <div className="panelHead"><div><h2>Kabul Kayıtları</h2><p>{admissions.length} kayıt</p></div></div>
          <div className="tableWrap">
            <table>
              <thead><tr><th>Tarih</th><th>Hasta</th><th>Tür</th><th>Oda/Yatak</th><th>Evrak</th><th>Emanet</th></tr></thead>
              <tbody>
                {admissions.map((r) => (
                  <tr key={r.id}>
                    <td>{r.admission_date}</td>
                    <td><b>{r.patient_name || '-'}</b></td>
                    <td>{r.admission_type}</td>
                    <td>{r.room_no || '-'} / {r.bed_no || '-'}</td>
                    <td>{r.documents_checked}</td>
                    <td>{r.belongings_checked}</td>
                  </tr>
                ))}
                {admissions.length === 0 && <tr><td colSpan={6}>Kayıt yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panelHead"><div><h2>Ayrılış / Vefat Kayıtları</h2><p>{exits.length} kayıt</p></div></div>
          <div className="tableWrap">
            <table>
              <thead><tr><th>Tarih</th><th>Hasta</th><th>Tür</th><th>Yer</th><th>Emanet</th><th>Arşiv</th></tr></thead>
              <tbody>
                {exits.map((r) => (
                  <tr key={r.id}>
                    <td>{r.exit_date}</td>
                    <td><b>{r.patient_name || '-'}</b></td>
                    <td><span className={`pill ${r.exit_type === 'Vefat' ? 'danger' : r.exit_type === 'Nakil' ? 'warn' : 'ok'}`}>{r.exit_type}</span></td>
                    <td>{r.destination || '-'}</td>
                    <td>{r.belongings_returned}</td>
                    <td>{r.archive_status}</td>
                  </tr>
                ))}
                {exits.length === 0 && <tr><td colSpan={6}>Kayıt yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
