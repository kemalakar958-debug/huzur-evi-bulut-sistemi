'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Row = Record<string, any>;

function todayIso() { return new Date().toISOString().slice(0, 10); }
function nowLocal() { return new Date().toISOString().slice(0, 16); }

function fmtDateTime(value: any) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('tr-TR'); } catch { return '-'; }
}

function fmtDate(value: any) {
  if (!value) return '-';
  try { return new Date(value).toLocaleDateString('tr-TR'); } catch { return '-'; }
}

function ageFromBirthDate(value: string | null) {
  if (!value) return '-';
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return '-';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return `${age} yaş`;
}

function patientInitials(name: string) {
  const parts = (name || '?').split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function vitalCritical(v: Row) {
  const alerts: string[] = [];
  const temp = Number(v.temperature || 0);
  const pulse = Number(v.pulse || 0);
  const spo2 = Number(v.spo2 || 0);
  const sugar = Number(v.blood_sugar || 0);
  const systolic = Number(v.systolic || 0);
  const diastolic = Number(v.diastolic || 0);

  if (temp >= 38) alerts.push('Ateş yüksek');
  if (spo2 > 0 && spo2 < 90) alerts.push('SpO₂ düşük');
  if (pulse > 120) alerts.push('Nabız yüksek');
  if (pulse > 0 && pulse < 50) alerts.push('Nabız düşük');
  if (systolic >= 180 || diastolic >= 110) alerts.push('Tansiyon kritik');
  if (sugar > 0 && sugar < 70) alerts.push('Şeker düşük');
  if (sugar > 300) alerts.push('Şeker yüksek');

  return alerts;
}

function hospitalStatusTone(status: string) {
  if (status === 'Hastanede') return 'danger';
  if (status === 'Kuruma Döndü') return 'ok';
  if (status === 'Kontrol Bekliyor') return 'warn';
  return 'blue';
}

export default function Patient360Client({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<Row | null>(null);
  const [facility, setFacility] = useState<Row | null>(null);
  const [relatives, setRelatives] = useState<Row[]>([]);
  const [medicines, setMedicines] = useState<Row[]>([]);
  const [vitals, setVitals] = useState<Row[]>([]);
  const [hospitalCases, setHospitalCases] = useState<Row[]>([]);
  const [incidents, setIncidents] = useState<Row[]>([]);
  const [timeline, setTimeline] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [vitalForm, setVitalForm] = useState({
    measured_at: nowLocal(),
    systolic: '',
    diastolic: '',
    pulse: '',
    temperature: '',
    spo2: '',
    blood_sugar: '',
    respiration: '',
    weight: '',
    note: '',
  });

  const [hospitalForm, setHospitalForm] = useState({
    departure_at: nowLocal(),
    hospital_name: '',
    department: '',
    doctor_name: '',
    reason: '',
    companion_name: '',
    ambulance: 'Hayır',
    status: 'Hastanede',
    diagnosis: '',
    treatment_result: '',
    return_at: '',
    control_date: '',
    note: '',
  });

  useEffect(() => {
    load();
  }, [patientId]);

  async function load() {
    setLoading(true);

    const { data: p } = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
    setPatient(p || null);

    if (p?.facility_id) {
      const { data: f } = await supabase.from('facilities').select('*').eq('id', p.facility_id).maybeSingle();
      setFacility(f || null);
    }

    const { data: rel } = await supabase.from('patient_relatives').select('*').eq('patient_id', patientId).order('is_primary', { ascending: false });
    setRelatives(rel || []);

    try {
      const { data: med } = await supabase.from('patient_medicine_plans').select('*').eq('patient_id', patientId).eq('status', 'Aktif').limit(20);
      setMedicines(med || []);
    } catch {
      setMedicines([]);
    }

    const { data: vitalRows } = await supabase.from('vital_records').select('*').eq('patient_id', patientId).order('measured_at', { ascending: false }).limit(20);
    setVitals(vitalRows || []);

    const { data: hosp } = await supabase.from('hospital_cases').select('*').eq('patient_id', patientId).order('departure_at', { ascending: false }).limit(20);
    setHospitalCases(hosp || []);

    try {
      const { data: inc } = await supabase.from('incident_records').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(10);
      setIncidents(inc || []);
    } catch {
      setIncidents([]);
    }

    const { data: tl } = await supabase.from('patient_timeline').select('*').eq('patient_id', patientId).order('event_date', { ascending: false }).limit(12);
    setTimeline(tl || []);

    setLoading(false);
  }

  async function addTimeline(title: string, description: string, eventType: string, sourceTable?: string, sourceId?: string) {
    if (!patient) return;

    await supabase.from('patient_timeline').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      event_type: eventType,
      title,
      description,
      event_date: new Date().toISOString(),
      source_table: sourceTable || null,
      source_id: sourceId || null,
    });
  }

  async function saveVital() {
    if (!patient) return;

    const payload = {
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      measured_at: vitalForm.measured_at ? new Date(vitalForm.measured_at).toISOString() : new Date().toISOString(),
      systolic: vitalForm.systolic ? Number(vitalForm.systolic) : null,
      diastolic: vitalForm.diastolic ? Number(vitalForm.diastolic) : null,
      pulse: vitalForm.pulse ? Number(vitalForm.pulse) : null,
      temperature: vitalForm.temperature ? Number(vitalForm.temperature) : null,
      spo2: vitalForm.spo2 ? Number(vitalForm.spo2) : null,
      blood_sugar: vitalForm.blood_sugar ? Number(vitalForm.blood_sugar) : null,
      respiration: vitalForm.respiration ? Number(vitalForm.respiration) : null,
      weight: vitalForm.weight ? Number(vitalForm.weight) : null,
      note: vitalForm.note || null,
    };

    const { data, error } = await supabase.from('vital_records').insert(payload).select('id').single();
    if (error) return alert(error.message);

    const alerts = vitalCritical(payload);
    await addTimeline(
      alerts.length ? 'Kritik vital kaydı girildi' : 'Vital kaydı girildi',
      `TA ${payload.systolic || '-'}/${payload.diastolic || '-'} • Nabız ${payload.pulse || '-'} • Ateş ${payload.temperature || '-'} • SpO₂ ${payload.spo2 || '-'}${alerts.length ? ' • Uyarı: ' + alerts.join(', ') : ''}`,
      alerts.length ? 'Kritik Vital' : 'Vital',
      'vital_records',
      data?.id
    );

    setVitalForm({
      measured_at: nowLocal(),
      systolic: '',
      diastolic: '',
      pulse: '',
      temperature: '',
      spo2: '',
      blood_sugar: '',
      respiration: '',
      weight: '',
      note: '',
    });

    await load();
  }

  async function saveHospitalCase() {
    if (!patient) return;
    if (!hospitalForm.hospital_name) return alert('Hastane adı yaz.');
    if (!hospitalForm.reason) return alert('Sevk nedeni yaz.');

    const payload = {
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      departure_at: hospitalForm.departure_at ? new Date(hospitalForm.departure_at).toISOString() : new Date().toISOString(),
      hospital_name: hospitalForm.hospital_name,
      department: hospitalForm.department || null,
      doctor_name: hospitalForm.doctor_name || null,
      reason: hospitalForm.reason,
      companion_name: hospitalForm.companion_name || null,
      ambulance: hospitalForm.ambulance,
      status: hospitalForm.status,
      diagnosis: hospitalForm.diagnosis || null,
      treatment_result: hospitalForm.treatment_result || null,
      return_at: hospitalForm.return_at ? new Date(hospitalForm.return_at).toISOString() : null,
      control_date: hospitalForm.control_date || null,
      note: hospitalForm.note || null,
    };

    const { data, error } = await supabase.from('hospital_cases').insert(payload).select('id').single();
    if (error) return alert(error.message);

    await supabase.from('patients').update({ status: hospitalForm.status === 'Hastanede' ? 'Hastanede' : patient.status }).eq('id', patient.id);

    await addTimeline(
      `${hospitalForm.hospital_name} hastane sevki`,
      `${hospitalForm.reason} • ${hospitalForm.department || '-'} • Refakatçi: ${hospitalForm.companion_name || '-'}`,
      'Hastane Sevk',
      'hospital_cases',
      data?.id
    );

    setHospitalForm({
      departure_at: nowLocal(),
      hospital_name: '',
      department: '',
      doctor_name: '',
      reason: '',
      companion_name: '',
      ambulance: 'Hayır',
      status: 'Hastanede',
      diagnosis: '',
      treatment_result: '',
      return_at: '',
      control_date: '',
      note: '',
    });

    await load();
  }

  async function markReturned(row: Row) {
    if (!patient) return;

    const diagnosis = prompt('Hastane tanı/sonuç:') || row.diagnosis || '';
    const result = prompt('Yapılan işlem / sonuç:') || row.treatment_result || '';

    const { error } = await supabase.from('hospital_cases').update({
      status: 'Kuruma Döndü',
      return_at: new Date().toISOString(),
      diagnosis,
      treatment_result: result,
    }).eq('id', row.id);

    if (error) return alert(error.message);

    await supabase.from('patients').update({ status: 'Aktif' }).eq('id', patient.id);

    await addTimeline(
      'Hasta hastaneden döndü',
      `${row.hospital_name || '-'} • ${diagnosis || '-'} • ${result || '-'}`,
      'Hastane Dönüş',
      'hospital_cases',
      row.id
    );

    await load();
  }

  const latestVital = vitals[0];
  const latestVitalAlerts = latestVital ? vitalCritical(latestVital) : [];
  const primaryRelative = relatives.find((r) => r.is_primary) || relatives[0];
  const activeHospital = hospitalCases.find((h) => h.status === 'Hastanede');
  const criticalVitals = vitals.filter((v) => vitalCritical(v).length > 0);
  const fallIncidents = incidents.filter((i) => String(i.incident_type || '').toLowerCase().includes('düş'));

  return (
    <>
      <Shell>
        <div className="p6Header">
          <div>
            <Link href="/patients">← Hasta Listesine Dön</Link>
            <h2>{patient?.full_name || 'Hasta 360'}</h2>
            <p>{facility?.name || 'Kurum'} • Oda {patient?.room_no || '-'} / Yatak {patient?.bed_no || '-'}</p>
          </div>
          <div className="p6HeaderActions">
            <button onClick={saveVital}>Vital Kaydet</button>
            <button onClick={saveHospitalCase}>Sevk Kaydet</button>
          </div>
        </div>

        {loading && <div className="p6Panel">Yükleniyor...</div>}

        {!loading && (
          <>
            <section className="p6EmergencyCard">
              <div className="p6EmergencyIdentity">
                <div className="p6Avatar">{patientInitials(patient?.full_name || '?')}</div>
                <div>
                  <h3>Acil Durum Kartı</h3>
                  <strong>{patient?.full_name || '-'}</strong>
                  <span>{ageFromBirthDate(patient?.birth_date)} • TC: {patient?.tc_no || '-'}</span>
                </div>
              </div>

              <div className="p6EmergencyGrid">
                <Info label="Kurum/Oda" value={`${facility?.name || '-'} • ${patient?.room_no || '-'} / ${patient?.bed_no || '-'}`} />
                <Info label="Alerjiler" value={patient?.allergies || '-'} danger />
                <Info label="Tanılar" value={patient?.diagnoses || '-'} />
                <Info label="Yakını" value={`${primaryRelative?.full_name || patient?.relative_name || '-'} • ${primaryRelative?.phone || patient?.relative_phone || '-'}`} />
                <Info label="Doktor" value={patient?.doctor_name || '-'} />
                <Info label="Aktif İlaç" value={`${medicines.length} ilaç`} />
              </div>

              {latestVitalAlerts.length > 0 && (
                <div className="p6CriticalStrip">
                  🔴 Kritik Vital: {latestVitalAlerts.join(', ')}
                </div>
              )}

              {activeHospital && (
                <div className="p6HospitalStrip">
                  🏥 Şu an hastanede: {activeHospital.hospital_name} • {activeHospital.reason}
                </div>
              )}
            </section>

            <div className="p6Stats">
              <Stat title="Son Vital Uyarısı" value={latestVitalAlerts.length} danger={latestVitalAlerts.length > 0} />
              <Stat title="Kritik Vital" value={criticalVitals.length} danger={criticalVitals.length > 0} />
              <Stat title="Hastane Sevk" value={hospitalCases.length} />
              <Stat title="Hastanede" value={activeHospital ? 1 : 0} danger={!!activeHospital} />
              <Stat title="Düşme Kaydı" value={fallIncidents.length} danger={fallIncidents.length > 0} />
              <Stat title="Aktif İlaç" value={medicines.length} />
            </div>

            <div className="p6MainGrid">
              <section className="p6Panel">
                <div className="p6PanelHead">
                  <h3>Vital Takip</h3>
                  <span>Kritik değerler otomatik işaretlenir.</span>
                </div>

                <div className="p6VitalForm">
                  <Field label="Ölçüm Zamanı" type="datetime-local" value={vitalForm.measured_at} onChange={(v) => setVitalForm({ ...vitalForm, measured_at: v })} />
                  <Field label="Büyük TA" value={vitalForm.systolic} onChange={(v) => setVitalForm({ ...vitalForm, systolic: v })} />
                  <Field label="Küçük TA" value={vitalForm.diastolic} onChange={(v) => setVitalForm({ ...vitalForm, diastolic: v })} />
                  <Field label="Nabız" value={vitalForm.pulse} onChange={(v) => setVitalForm({ ...vitalForm, pulse: v })} />
                  <Field label="Ateş" value={vitalForm.temperature} onChange={(v) => setVitalForm({ ...vitalForm, temperature: v })} />
                  <Field label="SpO₂" value={vitalForm.spo2} onChange={(v) => setVitalForm({ ...vitalForm, spo2: v })} />
                  <Field label="Şeker" value={vitalForm.blood_sugar} onChange={(v) => setVitalForm({ ...vitalForm, blood_sugar: v })} />
                  <Field label="Solunum" value={vitalForm.respiration} onChange={(v) => setVitalForm({ ...vitalForm, respiration: v })} />
                  <Field label="Kilo" value={vitalForm.weight} onChange={(v) => setVitalForm({ ...vitalForm, weight: v })} />
                  <Field label="Not" value={vitalForm.note} onChange={(v) => setVitalForm({ ...vitalForm, note: v })} />
                  <button onClick={saveVital}>Vital Kaydet</button>
                </div>

                <div className="p6VitalList">
                  {vitals.map((v) => {
                    const alerts = vitalCritical(v);
                    return (
                      <div className={`p6VitalRow ${alerts.length ? 'danger' : ''}`} key={v.id}>
                        <div>
                          <strong>{fmtDateTime(v.measured_at)}</strong>
                          <span>TA {v.systolic || '-'}/{v.diastolic || '-'} • Nabız {v.pulse || '-'} • Ateş {v.temperature || '-'} • SpO₂ {v.spo2 || '-'}</span>
                        </div>
                        {alerts.length > 0 && <b>{alerts.join(', ')}</b>}
                      </div>
                    );
                  })}
                  {vitals.length === 0 && <div className="p6Empty">Vital kaydı yok.</div>}
                </div>
              </section>

              <section className="p6Panel">
                <div className="p6PanelHead">
                  <h3>Hastane Sevk Merkezi</h3>
                  <span>Sevk ve dönüş bilgisi tek yerde.</span>
                </div>

                <div className="p6HospitalForm">
                  <Field label="Sevk Zamanı" type="datetime-local" value={hospitalForm.departure_at} onChange={(v) => setHospitalForm({ ...hospitalForm, departure_at: v })} />
                  <Field label="Hastane" value={hospitalForm.hospital_name} onChange={(v) => setHospitalForm({ ...hospitalForm, hospital_name: v })} />
                  <Field label="Bölüm" value={hospitalForm.department} onChange={(v) => setHospitalForm({ ...hospitalForm, department: v })} />
                  <Field label="Doktor" value={hospitalForm.doctor_name} onChange={(v) => setHospitalForm({ ...hospitalForm, doctor_name: v })} />
                  <Field label="Sevk Nedeni" value={hospitalForm.reason} onChange={(v) => setHospitalForm({ ...hospitalForm, reason: v })} />
                  <Field label="Refakatçi" value={hospitalForm.companion_name} onChange={(v) => setHospitalForm({ ...hospitalForm, companion_name: v })} />
                  <Select label="Ambulans" value={hospitalForm.ambulance} onChange={(v) => setHospitalForm({ ...hospitalForm, ambulance: v })} options={['Hayır', 'Evet']} />
                  <Select label="Durum" value={hospitalForm.status} onChange={(v) => setHospitalForm({ ...hospitalForm, status: v })} options={['Hastanede', 'Kontrol Bekliyor', 'Kuruma Döndü']} />
                  <Field label="Tanı" value={hospitalForm.diagnosis} onChange={(v) => setHospitalForm({ ...hospitalForm, diagnosis: v })} />
                  <Field label="Sonuç" value={hospitalForm.treatment_result} onChange={(v) => setHospitalForm({ ...hospitalForm, treatment_result: v })} />
                  <Field label="Kontrol Tarihi" type="date" value={hospitalForm.control_date} onChange={(v) => setHospitalForm({ ...hospitalForm, control_date: v })} />
                  <button onClick={saveHospitalCase}>Sevk Kaydet</button>
                </div>

                <div className="p6HospitalList">
                  {hospitalCases.map((h) => (
                    <div className={`p6HospitalRow ${hospitalStatusTone(h.status)}`} key={h.id}>
                      <div>
                        <strong>{h.hospital_name}</strong>
                        <span>{h.reason || '-'} • {h.department || '-'} • {fmtDateTime(h.departure_at)}</span>
                        <small>{h.diagnosis || h.treatment_result || h.note || '-'}</small>
                      </div>
                      <div className="p6HospitalActions">
                        <b>{h.status}</b>
                        {h.status === 'Hastanede' && <button onClick={() => markReturned(h)}>Döndü</button>}
                      </div>
                    </div>
                  ))}
                  {hospitalCases.length === 0 && <div className="p6Empty">Hastane kaydı yok.</div>}
                </div>
              </section>
            </div>

            <div className="p6BottomGrid">
              <section className="p6Panel">
                <h3>Aktif İlaçlar</h3>
                <div className="p6MiniList">
                  {medicines.slice(0, 10).map((m) => (
                    <p key={m.id}><b>{m.medicine_name}</b><span>Günlük {m.daily_dose || '-'} • Stok {m.initial_stock || '-'}</span></p>
                  ))}
                  {medicines.length === 0 && <div className="p6Empty">Aktif ilaç yok.</div>}
                </div>
              </section>

              <section className="p6Panel">
                <h3>Zaman Tüneli</h3>
                <div className="p6Timeline">
                  {timeline.map((t) => (
                    <div className="p6TimelineItem" key={t.id}>
                      <i />
                      <div>
                        <strong>{t.title}</strong>
                        <span>{t.description || t.event_type}</span>
                        <small>{fmtDateTime(t.event_date)}</small>
                      </div>
                    </div>
                  ))}
                  {timeline.length === 0 && <div className="p6Empty">Zaman tüneli yok.</div>}
                </div>
              </section>
            </div>
          </>
        )}
      </Shell>

      <style jsx global>{`
        .p6Header{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-bottom:16px}
        .p6Header a{color:#2563eb;text-decoration:none;font-weight:900}.p6Header h2{margin:8px 0 0;color:#0f172a;font-size:30px;font-weight:900}.p6Header p{margin:6px 0 0;color:#64748b}.p6HeaderActions{display:flex;gap:10px}.p6HeaderActions button{height:40px;border:none;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-weight:900;padding:0 12px;cursor:pointer}
        .p6EmergencyCard,.p6Panel{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px;box-shadow:0 8px 18px rgba(15,23,42,.04)}
        .p6EmergencyCard{margin-bottom:16px}.p6EmergencyIdentity{display:flex;align-items:center;gap:14px;margin-bottom:14px}.p6Avatar{width:72px;height:72px;border-radius:999px;background:#fee2e2;color:#991b1b;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900}.p6EmergencyIdentity h3{margin:0;color:#991b1b}.p6EmergencyIdentity strong{display:block;color:#0f172a;font-size:22px;margin-top:4px}.p6EmergencyIdentity span{display:block;color:#64748b;margin-top:3px}
        .p6EmergencyGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.p6Info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px}.p6Info.danger{background:#fef2f2;border-color:#fecaca}.p6Info span{display:block;color:#64748b;font-size:12px;font-weight:900}.p6Info b{display:block;color:#0f172a;margin-top:5px;line-height:1.35}
        .p6CriticalStrip{margin-top:12px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:14px;padding:12px;font-weight:900}.p6HospitalStrip{margin-top:12px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:14px;padding:12px;font-weight:900}
        .p6Stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-bottom:16px}.p6Stat{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px}.p6Stat span{display:block;color:#64748b;font-size:13px;font-weight:900}.p6Stat strong{display:block;color:#0f172a;font-size:30px;margin-top:7px}.p6Stat.danger{background:#fef2f2;border-color:#fecaca}.p6Stat.danger strong{color:#dc2626}
        .p6MainGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}.p6PanelHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.p6Panel h3,.p6PanelHead h3{margin:0;color:#0f172a;font-size:18px}.p6PanelHead span{color:#64748b;font-size:13px;font-weight:700}
        .p6VitalForm,.p6HospitalForm{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;align-items:end;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:12px;margin-bottom:14px}.p6HospitalForm{grid-template-columns:repeat(4,minmax(0,1fr))}
        .p6Field label{display:block;color:#334155;font-size:12px;font-weight:900;margin-bottom:5px}.p6Field input,.p6Field select{width:100%;height:40px;border:1px solid #cbd5e1;border-radius:10px;padding:0 10px;background:white;color:#0f172a}
        .p6VitalForm button,.p6HospitalForm button{height:40px;border:none;border-radius:10px;background:#2563eb;color:white;font-weight:900;padding:0 14px;cursor:pointer}
        .p6VitalList,.p6HospitalList,.p6MiniList,.p6Timeline{display:flex;flex-direction:column;gap:10px}.p6VitalRow,.p6HospitalRow{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border:1px solid #e5e7eb;border-radius:14px;padding:12px}.p6VitalRow.danger,.p6HospitalRow.danger{background:#fef2f2;border-color:#fecaca}.p6HospitalRow.ok{background:#f0fdf4;border-color:#bbf7d0}.p6HospitalRow.warn{background:#fffbeb;border-color:#fde68a}.p6HospitalRow.blue{background:#eff6ff;border-color:#bfdbfe}
        .p6VitalRow strong,.p6HospitalRow strong{display:block;color:#0f172a}.p6VitalRow span,.p6HospitalRow span,.p6HospitalRow small{display:block;color:#64748b;margin-top:4px}.p6VitalRow b{color:#dc2626}.p6HospitalActions{text-align:right}.p6HospitalActions b{display:block;color:#0f172a}.p6HospitalActions button{margin-top:8px;height:34px;border:none;border-radius:10px;background:#16a34a;color:white;font-weight:900;padding:0 12px;cursor:pointer}
        .p6BottomGrid{display:grid;grid-template-columns:1fr 2fr;gap:16px}.p6MiniList p{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #f1f5f9;padding-bottom:9px;margin:0}.p6MiniList b{color:#0f172a}.p6MiniList span{color:#64748b}
        .p6TimelineItem{display:grid;grid-template-columns:14px 1fr;gap:10px}.p6TimelineItem i{width:12px;height:12px;border-radius:999px;background:#2563eb;margin-top:5px;box-shadow:0 0 0 4px #dbeafe}.p6TimelineItem strong{display:block;color:#0f172a}.p6TimelineItem span{display:block;color:#475569;margin-top:3px}.p6TimelineItem small{display:block;color:#64748b;margin-top:3px}.p6Empty{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px;color:#64748b;font-weight:800}
        @media(max-width:1200px){.p6EmergencyGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.p6Stats{grid-template-columns:repeat(3,minmax(0,1fr))}.p6MainGrid,.p6BottomGrid{grid-template-columns:1fr}.p6VitalForm,.p6HospitalForm{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:760px){.p6Header,.p6HeaderActions{flex-direction:column;align-items:stretch}.p6EmergencyGrid,.p6VitalForm,.p6HospitalForm{grid-template-columns:1fr}.p6Stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `}</style>
    </>
  );
}

function Info({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div className={`p6Info ${danger ? 'danger' : ''}`}><span>{label}</span><b>{value}</b></div>;
}

function Field({ label, value, onChange, type = 'number' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <div className="p6Field"><label>{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return <div className="p6Field"><label>{label}</label><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select></div>;
}

function Stat({ title, value, danger = false }: { title: string; value: number; danger?: boolean }) {
  return <div className={`p6Stat ${danger ? 'danger' : ''}`}><span>{title}</span><strong>{value}</strong></div>;
}
