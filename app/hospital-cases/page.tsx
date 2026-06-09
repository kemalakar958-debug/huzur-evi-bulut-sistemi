'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = Record<string, any>;
type CaseRow = Record<string, any>;

const statusList = [
  'Sevk Edildi',
  'Muayene Bekliyor',
  'Tetkik Bekliyor',
  'Yatış Yapıldı',
  'Ameliyat Planlandı',
  'Taburcu Edildi',
  'Kuruma Döndü',
  'İptal',
];

export default function HospitalCasesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRow | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    patient_id: '',
    hospital_name: '',
    clinic_name: '',
    doctor_name: '',
    referral_reason: '',
    transport_type: 'Ambulans',
    ambulance_info: '',
    companion_name: '',
    sent_by: '',
    departure_at: new Date().toISOString().slice(0, 16),
    status: 'Sevk Edildi',
    note: '',
  });

  const [returnForm, setReturnForm] = useState({
    returned_at: '',
    result_summary: '',
    diagnosis_result: '',
    new_medications: '',
    new_treatments: '',
    control_date: '',
    return_note: '',
    status: 'Kuruma Döndü',
  });

  const [docForm, setDocForm] = useState({
    document_type: 'Epikriz',
    title: '',
    note: '',
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: patientRows } = await supabase
      .from('patients')
      .select('*')
      .order('full_name');

    setPatients(patientRows || []);

    if (patientRows?.[0]) {
      setForm((old) => ({ ...old, patient_id: old.patient_id || patientRows[0].id }));
    }

    const { data: caseRows } = await supabase
      .from('hospital_cases')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    setCases(caseRows || []);
  }

  function patientName(id: string) {
    return patients.find((p) => p.id === id)?.full_name || '-';
  }

  async function createCase() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return alert('Hasta seç.');
    if (!form.hospital_name) return alert('Hastane adı zorunlu.');
    if (!form.referral_reason) return alert('Sevk nedeni zorunlu.');

    const { error } = await supabase.from('hospital_cases').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      hospital_name: form.hospital_name,
      clinic_name: form.clinic_name || null,
      doctor_name: form.doctor_name || null,
      referral_reason: form.referral_reason,
      transport_type: form.transport_type,
      ambulance_info: form.ambulance_info || null,
      companion_name: form.companion_name || null,
      sent_by: form.sent_by || null,
      departure_at: form.departure_at || new Date().toISOString(),
      status: form.status,
      note: form.note || null,
    });

    if (error) return alert(error.message);

    await supabase.from('patients').update({
      status: 'Hastanede',
      status_note: `${form.hospital_name} - ${form.referral_reason}`,
      status_updated_at: new Date().toISOString(),
    }).eq('id', patient.id);

    setForm((old) => ({
      ...old,
      hospital_name: '',
      clinic_name: '',
      doctor_name: '',
      referral_reason: '',
      ambulance_info: '',
      companion_name: '',
      sent_by: '',
      departure_at: new Date().toISOString().slice(0, 16),
      status: 'Sevk Edildi',
      note: '',
    }));

    await load();
    alert('Hastane süreci oluşturuldu. Hasta durumu Hastanede yapıldı.');
  }

  async function updateCaseStatus(row: CaseRow, status: string) {
    const { error } = await supabase
      .from('hospital_cases')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (error) return alert(error.message);

    await supabase.from('hospital_followups').insert({
      facility_id: row.facility_id,
      patient_id: row.patient_id,
      case_id: row.id,
      patient_name: row.patient_name,
      followup_type: 'Durum Güncelleme',
      status,
      note: `Durum ${status} olarak güncellendi.`,
    });

    await load();
  }

  async function closeReturn(row: CaseRow) {
    if (!returnForm.returned_at) return alert('Dönüş tarih/saat gir.');

    const { error } = await supabase
      .from('hospital_cases')
      .update({
        returned_at: returnForm.returned_at,
        result_summary: returnForm.result_summary || null,
        diagnosis_result: returnForm.diagnosis_result || null,
        new_medications: returnForm.new_medications || null,
        new_treatments: returnForm.new_treatments || null,
        control_date: returnForm.control_date || null,
        return_note: returnForm.return_note || null,
        status: returnForm.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (error) return alert(error.message);

    await supabase.from('patients').update({
      status: 'Aktif',
      status_note: `Hastaneden döndü: ${returnForm.result_summary || '-'}`,
      status_updated_at: new Date().toISOString(),
    }).eq('id', row.patient_id);

    await supabase.from('hospital_followups').insert({
      facility_id: row.facility_id,
      patient_id: row.patient_id,
      case_id: row.id,
      patient_name: row.patient_name,
      followup_type: 'Hastaneden Dönüş',
      status: returnForm.status,
      note: returnForm.result_summary || null,
    });

    setSelectedCase(null);
    setReturnForm({
      returned_at: '',
      result_summary: '',
      diagnosis_result: '',
      new_medications: '',
      new_treatments: '',
      control_date: '',
      return_note: '',
      status: 'Kuruma Döndü',
    });

    await load();
    alert('Dönüş kaydı tamamlandı. Hasta durumu Aktif yapıldı.');
  }

  function safeFileName(name: string) {
    return name.replaceAll(' ', '_').replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_.-]/g, '').toLowerCase();
  }

  async function uploadDocument(row: CaseRow) {
    if (!docFile) return alert('Dosya seç.');
    if (!docForm.document_type) return alert('Evrak türü seç.');

    const path = `${row.facility_id}/${row.patient_id}/${row.id}/${Date.now()}_${safeFileName(docFile.name)}`;

    const { error: uploadError } = await supabase.storage
      .from('hospital-documents')
      .upload(path, docFile, { cacheControl: '3600', upsert: false });

    if (uploadError) return alert(uploadError.message);

    const { error } = await supabase.from('hospital_documents').insert({
      facility_id: row.facility_id,
      patient_id: row.patient_id,
      case_id: row.id,
      patient_name: row.patient_name,
      document_type: docForm.document_type,
      title: docForm.title || docForm.document_type,
      note: docForm.note || null,
      storage_path: path,
    });

    if (error) return alert(error.message);

    setDocFile(null);
    setDocForm({ document_type: 'Epikriz', title: '', note: '' });
    alert('Hastane evrakı yüklendi.');
  }

  async function openDocument(path: string) {
    const { data, error } = await supabase.storage
      .from('hospital-documents')
      .createSignedUrl(path, 60 * 10);

    if (error) return alert(error.message);
    window.open(data.signedUrl, '_blank');
  }

  const openCases = cases.filter((c) => !['Kuruma Döndü', 'İptal'].includes(c.status)).length;
  const inpatient = cases.filter((c) => c.status === 'Yatış Yapıldı').length;
  const returned = cases.filter((c) => c.status === 'Kuruma Döndü').length;
  const pendingDocs = cases.filter((c) => c.status === 'Kuruma Döndü' && !c.result_summary).length;

  return (
    <Shell>
      <div className="hero">
        <h2>Hastane Süreç Merkezi</h2>
        <p>Hastaneye gidiş, hastanede takip, dönüş, epikriz, reçete ve kontrol tarihi yönetimi.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Açık Süreç</span><strong>{openCases}</strong></div>
        <div className="kpi"><span>Yatış</span><strong>{inpatient}</strong></div>
        <div className="kpi"><span>Dönen</span><strong>{returned}</strong></div>
        <div className="kpi"><span>Eksik Sonuç</span><strong>{pendingDocs}</strong></div>
      </div>

      <div className="panel">
        <div className="panelHead"><div><h2>Yeni Hastane Süreci</h2><p>Sevk oluşturur ve hastayı Hastanede durumuna alır.</p></div></div>

        <div className="grid grid4">
          <div><label>Hasta</label><select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>{patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
          <div><label>Gidiş Tarih/Saat</label><input type="datetime-local" value={form.departure_at} onChange={(e) => setForm({ ...form, departure_at: e.target.value })} /></div>
          <div><label>Hastane</label><input value={form.hospital_name} onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} /></div>
          <div><label>Poliklinik / Servis</label><input value={form.clinic_name} onChange={(e) => setForm({ ...form, clinic_name: e.target.value })} /></div>
        </div>

        <div className="grid grid4">
          <div><label>Doktor</label><input value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></div>
          <div><label>Sevk Nedeni</label><input value={form.referral_reason} onChange={(e) => setForm({ ...form, referral_reason: e.target.value })} /></div>
          <div><label>Ulaşım</label><select value={form.transport_type} onChange={(e) => setForm({ ...form, transport_type: e.target.value })}><option>Ambulans</option><option>Özel Araç</option><option>Taksi</option><option>Diğer</option></select></div>
          <div><label>Ambulans Bilgisi</label><input value={form.ambulance_info} onChange={(e) => setForm({ ...form, ambulance_info: e.target.value })} /></div>
        </div>

        <div className="grid grid4">
          <div><label>Refakatçi</label><input value={form.companion_name} onChange={(e) => setForm({ ...form, companion_name: e.target.value })} /></div>
          <div><label>Gönderen Personel</label><input value={form.sent_by} onChange={(e) => setForm({ ...form, sent_by: e.target.value })} /></div>
          <div><label>Durum</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statusList.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label>Not</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        </div>

        <div className="actions"><button className="primary" onClick={createCase}>Hastane Süreci Başlat</button></div>
      </div>

      {selectedCase && (
        <div className="grid grid2">
          <div className="panel">
            <div className="panelHead"><div><h2>Hastaneden Dönüş Kaydı</h2><p>{selectedCase.patient_name} - {selectedCase.hospital_name}</p></div></div>
            <div className="grid grid2">
              <div><label>Dönüş Tarih/Saat</label><input type="datetime-local" value={returnForm.returned_at} onChange={(e) => setReturnForm({ ...returnForm, returned_at: e.target.value })} /></div>
              <div><label>Kontrol Tarihi</label><input type="date" value={returnForm.control_date} onChange={(e) => setReturnForm({ ...returnForm, control_date: e.target.value })} /></div>
            </div>
            <div><label>Sonuç Özeti</label><textarea value={returnForm.result_summary} onChange={(e) => setReturnForm({ ...returnForm, result_summary: e.target.value })} /></div>
            <div><label>Tanı / Sonuç</label><input value={returnForm.diagnosis_result} onChange={(e) => setReturnForm({ ...returnForm, diagnosis_result: e.target.value })} /></div>
            <div><label>Yeni İlaçlar</label><textarea value={returnForm.new_medications} onChange={(e) => setReturnForm({ ...returnForm, new_medications: e.target.value })} /></div>
            <div><label>Yeni Tedaviler</label><textarea value={returnForm.new_treatments} onChange={(e) => setReturnForm({ ...returnForm, new_treatments: e.target.value })} /></div>
            <div><label>Dönüş Notu</label><input value={returnForm.return_note} onChange={(e) => setReturnForm({ ...returnForm, return_note: e.target.value })} /></div>
            <div className="actions"><button className="green" onClick={() => closeReturn(selectedCase)}>Dönüşü Tamamla</button><button className="soft" onClick={() => setSelectedCase(null)}>Kapat</button></div>
          </div>

          <div className="panel">
            <div className="panelHead"><div><h2>Evrak Yükle</h2><p>Epikriz, reçete, tetkik sonucu vb.</p></div></div>
            <div className="grid grid2">
              <div><label>Evrak Türü</label><select value={docForm.document_type} onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}><option>Epikriz</option><option>Reçete</option><option>Tetkik Sonucu</option><option>Konsültasyon</option><option>Diğer</option></select></div>
              <div><label>Başlık</label><input value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} /></div>
            </div>
            <div><label>Not</label><input value={docForm.note} onChange={(e) => setDocForm({ ...docForm, note: e.target.value })} /></div>
            <div><label>Dosya</label><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setDocFile(e.target.files?.[0] || null)} /></div>
            {docFile && <div className="notice">Seçilen dosya: <b>{docFile.name}</b></div>}
            <div className="actions"><button className="primary" onClick={() => uploadDocument(selectedCase)}>Evrak Yükle</button></div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panelHead"><div><h2>Hastane Süreçleri</h2><p>Son 500 kayıt</p></div></div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Hasta</th><th>Gidiş</th><th>Hastane</th><th>Poliklinik</th><th>Neden</th><th>Refakatçi</th><th>Durum</th><th>Dönüş</th><th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((row) => (
                <tr key={row.id}>
                  <td><b>{row.patient_name || patientName(row.patient_id)}</b></td>
                  <td>{row.departure_at ? new Date(row.departure_at).toLocaleString('tr-TR') : '-'}</td>
                  <td>{row.hospital_name}</td>
                  <td>{row.clinic_name || '-'}</td>
                  <td>{row.referral_reason || '-'}</td>
                  <td>{row.companion_name || '-'}</td>
                  <td><span className={`pill ${row.status === 'Kuruma Döndü' ? 'ok' : row.status === 'İptal' ? 'danger' : 'warn'}`}>{row.status}</span></td>
                  <td>{row.returned_at ? new Date(row.returned_at).toLocaleString('tr-TR') : '-'}</td>
                  <td>
                    <div className="actions" style={{ marginTop: 0 }}>
                      <select value={row.status} onChange={(e) => updateCaseStatus(row, e.target.value)}>
                        {statusList.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button className="green" onClick={() => setSelectedCase(row)}>Dönüş/Evrak</button>
                    </div>
                  </td>
                </tr>
              ))}
              {cases.length === 0 && <tr><td colSpan={9}>Kayıt yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
