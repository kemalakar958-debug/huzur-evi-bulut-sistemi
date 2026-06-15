'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { getInsertFacilityId, useActiveFacility } from '@/lib/activeFacility';

type Facility = { id: string; name: string };

const tabs = ['Kimlik Bilgileri', 'İletişim Bilgileri', 'Sağlık Bilgileri', 'Kurum Bilgileri', 'Ek Bilgiler'];

function calcAge(birth: string) {
  if (!birth) return '-';
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return '-';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return `${age} yaş`;
}

function tcValid(tc: string) {
  return /^\d{11}$/.test(tc);
}

export default function NewPatientPage() {
  const ctx = useActiveFacility();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeTab, setActiveTab] = useState('Kimlik Bilgileri');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    facility_id: '',
    full_name: 'Mehmet Bilgin',
    tc_no: '12345678901',
    birth_date: '1948-05-15',
    birth_place: 'Sivas',
    gender: 'Erkek',
    marital_status: 'Evli',
    nationality: 'T.C.',
    blood_type: 'A Rh (+)',
    mother_name: 'Zehra',
    father_name: 'Hasan',
    city: 'Sivas',
    district: 'Merkez',
    address: 'Eğribucak Mah. 123. Sk. No: 45/3 Merkez / Sivas',

    relative_name: 'Ayşe Bilgin',
    relative_phone: '0555 000 00 00',
    second_relative_name: '',
    second_relative_phone: '',

    doctor_name: 'Dr. Ahmet Kaya',
    diagnoses: 'Hipertansiyon, Diyabet',
    allergies: 'Penisilin',
    diet_note: 'Diyabetik diyet',

    floor_no: '2',
    room_no: '203',
    bed_no: '2',
    alarm_no: 'A-203',
    status: 'Aktif',
    admission_date: new Date().toISOString().slice(0, 10),

    identity_front_file: 'mehmet_bilgin_tc_on.jpg',
    identity_back_file: 'mehmet_bilgin_tc_arka.jpg',
    medula_file: '',
    health_report_file: '',
    note: '',
  });

  useEffect(() => {
    loadFacilities();
  }, [ctx.activeFacilityId, ctx.role, ctx.userFacilityId]);

  async function loadFacilities() {
    const { data } = await supabase.from('facilities').select('id, name').order('name');
    const rows = data || [];
    setFacilities(rows);

    setForm((old) => ({
      ...old,
      facility_id: old.facility_id || getInsertFacilityId(ctx, rows[0]?.id),
    }));
  }

  function setField(name: string, value: string) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  const patientNo = useMemo(() => {
    const seed = (form.tc_no || '00000000000').slice(-5);
    return `HS-2025-${seed}`;
  }, [form.tc_no]);

  const checks = [
    { label: 'T.C. Kimlik No 11 haneli', ok: tcValid(form.tc_no) },
    { label: 'Hasta adı girildi', ok: !!form.full_name },
    { label: 'Doğum tarihi girildi', ok: !!form.birth_date },
    { label: 'Kurum seçildi', ok: !!form.facility_id },
    { label: 'Oda/Yatak bilgisi girildi', ok: !!form.room_no && !!form.bed_no },
    { label: 'Yakın telefonu girildi', ok: !!form.relative_phone },
  ];

  async function savePatient() {
    if (!form.full_name) return alert('Hasta adı gir.');
    if (!form.facility_id) return alert('Kurum seç.');
    if (!tcValid(form.tc_no)) return alert('TC 11 haneli olmalı.');

    setSaving(true);

    const { data, error } = await supabase
      .from('patients')
      .insert({
        facility_id: form.facility_id,
        full_name: form.full_name,
        tc_no: form.tc_no,
        birth_date: form.birth_date || null,
        floor_no: form.floor_no,
        room_no: form.room_no,
        bed_no: form.bed_no,
        alarm_no: form.alarm_no,
        relative_name: form.relative_name,
        relative_phone: form.relative_phone,
        doctor_name: form.doctor_name,
        allergies: form.allergies,
        diagnoses: form.diagnoses,
        status: form.status,
      })
      .select('id')
      .single();

    setSaving(false);

    if (error) return alert(error.message);

    if (data?.id) {
      window.location.href = `/patients/${data.id}`;
    } else {
      window.location.href = '/patients';
    }
  }

  return (
    <>
      <Shell>
        <div className="newPatientHeader">
          <div>
            <h2>Yeni Hasta Ekle</h2>
            <p>Hasta bilgilerini eksiksiz girin. Kaydettikten sonra Hasta 360 dosyası açılır.</p>
          </div>
          <div className="headerActions">
            <button className="softBtn" onClick={() => window.location.href = '/patients'}>İptal</button>
            <button className="primaryBtn" onClick={savePatient} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet ve Devam Et →'}</button>
          </div>
        </div>

        <div className="newPatientLayout">
          <div className="formCard">
            <div className="tabBar">
              {tabs.map((tab) => (
                <button className={activeTab === tab ? 'active' : ''} key={tab} onClick={() => setActiveTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'Kimlik Bilgileri' && (
              <div className="formGrid">
                <Field label="T.C. Kimlik No *" value={form.tc_no} onChange={(v) => setField('tc_no', v)} />
                <Field label="Ad Soyad *" value={form.full_name} onChange={(v) => setField('full_name', v)} />
                <Field label="Doğum Tarihi *" type="date" value={form.birth_date} onChange={(v) => setField('birth_date', v)} />
                <Field label="Doğum Yeri" value={form.birth_place} onChange={(v) => setField('birth_place', v)} />
                <Select label="Cinsiyet *" value={form.gender} onChange={(v) => setField('gender', v)} options={['Erkek', 'Kadın']} />
                <Select label="Medeni Hali" value={form.marital_status} onChange={(v) => setField('marital_status', v)} options={['Evli', 'Bekar', 'Dul']} />
                <Select label="Uyruk" value={form.nationality} onChange={(v) => setField('nationality', v)} options={['T.C.', 'Yabancı']} />
                <Select label="Kan Grubu" value={form.blood_type} onChange={(v) => setField('blood_type', v)} options={['A Rh (+)', 'A Rh (-)', 'B Rh (+)', 'B Rh (-)', 'AB Rh (+)', 'AB Rh (-)', '0 Rh (+)', '0 Rh (-)']} />
                <Field label="Anne Adı" value={form.mother_name} onChange={(v) => setField('mother_name', v)} />
                <Field label="Baba Adı" value={form.father_name} onChange={(v) => setField('father_name', v)} />
                <Field label="Nüfusa Kayıtlı İl" value={form.city} onChange={(v) => setField('city', v)} />
                <Field label="Nüfusa Kayıtlı İlçe" value={form.district} onChange={(v) => setField('district', v)} />
                <Field label="Adres" wide value={form.address} onChange={(v) => setField('address', v)} />
              </div>
            )}

            {activeTab === 'İletişim Bilgileri' && (
              <div className="formGrid">
                <Field label="Yakın Adı" value={form.relative_name} onChange={(v) => setField('relative_name', v)} />
                <Field label="Yakın Telefon" value={form.relative_phone} onChange={(v) => setField('relative_phone', v)} />
                <Field label="2. Yakın Adı" value={form.second_relative_name} onChange={(v) => setField('second_relative_name', v)} />
                <Field label="2. Yakın Telefon" value={form.second_relative_phone} onChange={(v) => setField('second_relative_phone', v)} />
                <Field label="Adres" wide value={form.address} onChange={(v) => setField('address', v)} />
              </div>
            )}

            {activeTab === 'Sağlık Bilgileri' && (
              <div className="formGrid">
                <Field label="Doktor Adı" value={form.doctor_name} onChange={(v) => setField('doctor_name', v)} />
                <Field label="Alerjiler" value={form.allergies} onChange={(v) => setField('allergies', v)} />
                <Field label="Tanılar" wide value={form.diagnoses} onChange={(v) => setField('diagnoses', v)} />
                <Field label="Beslenme / Diyet Notu" wide value={form.diet_note} onChange={(v) => setField('diet_note', v)} />
              </div>
            )}

            {activeTab === 'Kurum Bilgileri' && (
              <div className="formGrid">
                <div>
                  <label>Kurum *</label>
                  <select value={form.facility_id} onChange={(e) => setField('facility_id', e.target.value)} disabled={ctx.role !== 'founder' || ctx.activeFacilityId !== 'general'}>
                    {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <Field label="Kat No" value={form.floor_no} onChange={(v) => setField('floor_no', v)} />
                <Field label="Oda No" value={form.room_no} onChange={(v) => setField('room_no', v)} />
                <Field label="Yatak No" value={form.bed_no} onChange={(v) => setField('bed_no', v)} />
                <Field label="Alarm No" value={form.alarm_no} onChange={(v) => setField('alarm_no', v)} />
                <Select label="Durum" value={form.status} onChange={(v) => setField('status', v)} options={['Aktif', 'Hastanede', 'İzinli', 'Vefat', 'Ayrıldı']} />
                <Field label="Kabul Tarihi" type="date" value={form.admission_date} onChange={(v) => setField('admission_date', v)} />
              </div>
            )}

            {activeTab === 'Ek Bilgiler' && (
              <div className="formGrid">
                <FileBox label="Nüfus Cüzdanı Ön Yüz" value={form.identity_front_file} onChange={(v) => setField('identity_front_file', v)} />
                <FileBox label="Nüfus Cüzdanı Arka Yüz" value={form.identity_back_file} onChange={(v) => setField('identity_back_file', v)} />
                <FileBox label="Medula / Reçete PDF-Fotoğraf" value={form.medula_file} onChange={(v) => setField('medula_file', v)} />
                <FileBox label="Sağlık Raporu" value={form.health_report_file} onChange={(v) => setField('health_report_file', v)} />
                <Field label="Not" wide value={form.note} onChange={(v) => setField('note', v)} />
              </div>
            )}

            <div className="bottomBar">
              <button className="softBtn" onClick={() => window.location.href = '/patients'}>İptal</button>
              <button className="draftBtn">Taslak Olarak Kaydet</button>
              <button className="primaryBtn" onClick={savePatient} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet ve Devam Et →'}</button>
            </div>
          </div>

          <aside className="rightPreview">
            <div className="previewCard">
              <h3>Hasta Önizleme</h3>
              <div className="previewAvatar">{form.full_name.slice(0, 1).toUpperCase()}</div>
              <h4>{form.full_name || 'Hasta Adı'}</h4>
              <p>T.C. {form.tc_no || '-'}</p>
              <p>{form.birth_date ? `${new Date(form.birth_date).toLocaleDateString('tr-TR')} (${calcAge(form.birth_date)})` : '-'}</p>
              <span>{form.gender}</span>
            </div>

            <div className="autoNoCard">
              <span>Hasta Numarası (Otomatik)</span>
              <strong>{patientNo}</strong>
              <p>Hasta kaydedildiğinde otomatik oluşturulacaktır.</p>
            </div>

            <div className="checkCard">
              <h3>Hızlı Kontrol</h3>
              {checks.map((c) => (
                <p key={c.label} className={c.ok ? 'ok' : 'bad'}>{c.ok ? '✓' : '×'} {c.label}</p>
              ))}
            </div>

            <div className="noteCard">
              <h3>Açıklama</h3>
              <p>Hasta kaydı oluşturduktan sonra iletişim, sağlık, ilaç ve Hasta 360 bilgilerine devam edebilirsiniz.</p>
            </div>
          </aside>
        </div>
      </Shell>

      <style jsx global>{`
        .newPatientHeader{display:flex;justify-content:space-between;gap:16px;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-bottom:16px}
        .newPatientHeader h2{margin:0;color:#0f172a;font-size:28px;font-weight:900}.newPatientHeader p{margin:6px 0 0;color:#64748b}
        .headerActions{display:flex;gap:10px}.newPatientLayout{display:grid;grid-template-columns:minmax(0,1fr) 350px;gap:18px}
        .formCard,.previewCard,.autoNoCard,.checkCard,.noteCard{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px;box-shadow:0 10px 24px rgba(15,23,42,.04)}
        .tabBar{display:flex;gap:8px;overflow:auto;border-bottom:1px solid #e5e7eb;margin-bottom:18px}.tabBar button{border:none;background:transparent;padding:12px 14px;color:#475569;font-weight:900;cursor:pointer;white-space:nowrap}.tabBar button.active{color:#1d4ed8;border-bottom:3px solid #2563eb}
        .formGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.formGrid label{display:block;color:#334155;font-size:13px;font-weight:900;margin-bottom:7px}.formGrid input,.formGrid select{width:100%;height:44px;border:1px solid #cbd5e1;border-radius:12px;padding:0 12px;color:#0f172a;background:#fff}.wideField{grid-column:span 3}
        .fileBox{border:1px solid #cbd5e1;border-radius:12px;padding:9px 10px;height:44px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff}.fileBox button{border:1px solid #cbd5e1;background:#f8fafc;border-radius:10px;height:30px;padding:0 10px;font-weight:800}.fileBox span{font-size:13px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .bottomBar{display:flex;justify-content:flex-end;gap:12px;border-top:1px solid #e5e7eb;margin-top:20px;padding-top:16px}.softBtn,.draftBtn,.primaryBtn{height:44px;border:none;border-radius:12px;padding:0 16px;font-weight:900;cursor:pointer}.softBtn{background:#f1f5f9;color:#334155}.draftBtn{background:#e0f2fe;color:#075985}.primaryBtn{background:#1d4ed8;color:#fff}.primaryBtn:disabled{opacity:.65}
        .rightPreview{display:flex;flex-direction:column;gap:14px}.previewCard h3,.checkCard h3,.noteCard h3{margin:0 0 12px;color:#0f172a}.previewAvatar{width:88px;height:88px;border-radius:999px;background:#e2e8f0;color:#64748b;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:900;margin:12px auto}.previewCard{text-align:center}.previewCard h4{margin:0;color:#0f172a;font-size:20px}.previewCard p{margin:6px 0;color:#475569}.previewCard span{display:inline-block;background:#dbeafe;color:#1d4ed8;border-radius:10px;padding:5px 10px;font-weight:900;font-size:13px}
        .autoNoCard{background:#fffbeb;border-color:#fde68a}.autoNoCard span{color:#92400e;font-weight:900}.autoNoCard strong{display:block;color:#0f172a;font-size:26px;margin-top:10px}.autoNoCard p,.noteCard p{color:#64748b;line-height:1.55}.checkCard{background:#eff6ff;border-color:#bfdbfe}.checkCard p{margin:8px 0;font-weight:800}.checkCard .ok{color:#166534}.checkCard .bad{color:#991b1b}.noteCard{background:#faf5ff;border-color:#e9d5ff}
        @media(max-width:1100px){.newPatientLayout{grid-template-columns:1fr}.formGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.wideField{grid-column:span 2}}@media(max-width:700px){.newPatientHeader,.bottomBar{flex-direction:column;align-items:stretch}.formGrid{grid-template-columns:1fr}.wideField{grid-column:span 1}.headerActions{flex-direction:column}}
      `}</style>
    </>
  );
}

function Field({ label, value, onChange, type = 'text', wide = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; wide?: boolean }) {
  return <div className={wide ? 'wideField' : ''}><label>{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return <div><label>{label}</label><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select></div>;
}

function FileBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label>{label}</label>
      <div className="fileBox">
        <button type="button" onClick={() => onChange(value || 'dosya_secildi.jpg')}>Dosya Seç</button>
        <span>{value || 'Dosya seçilmedi'}</span>
        {value && <b style={{ color: '#16a34a' }}>✓</b>}
      </div>
    </div>
  );
}
