'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Row = Record<string, any>;

function fmtDate(value: any) {
  if (!value) return '-';
  try { return new Date(value).toLocaleDateString('tr-TR'); } catch { return '-'; }
}

function fmtDateTime(value: any) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('tr-TR'); } catch { return '-'; }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

function initials(name: string) {
  const parts = (name || '?').split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function daysBetweenToday(dateValue: string | null) {
  if (!dateValue) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function calcMed(m: Row) {
  const start = m.start_date || todayIso();
  const startDate = new Date(`${start}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daily = Number(m.daily_dose || 0);
  const initial = Number(m.initial_stock || 0);
  const daysPassed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const remaining = Math.max(0, initial - daily * daysPassed);
  const remainingDays = daily > 0 ? Math.floor(remaining / daily) : null;
  return {
    remaining,
    remainingDays,
    reportDays: daysBetweenToday(m.report_end_date),
    expiryDays: daysBetweenToday(m.expiry_date),
  };
}

function alertTone(days: number | null) {
  if (days === null) return 'muted';
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warn';
  return 'ok';
}

function vitalCritical(v: Row) {
  const a: string[] = [];
  const temp = Number(v.temperature || 0);
  const pulse = Number(v.pulse || 0);
  const spo2 = Number(v.spo2 || 0);
  const sugar = Number(v.blood_sugar || 0);
  const sys = Number(v.systolic || 0);
  const dia = Number(v.diastolic || 0);
  if (temp >= 38) a.push('Ateş yüksek');
  if (spo2 > 0 && spo2 < 90) a.push('SpO₂ düşük');
  if (pulse > 120) a.push('Nabız yüksek');
  if (pulse > 0 && pulse < 50) a.push('Nabız düşük');
  if (sys >= 180 || dia >= 110) a.push('Tansiyon kritik');
  if (sugar > 0 && sugar < 70) a.push('Şeker düşük');
  if (sugar > 300) a.push('Şeker yüksek');
  return a;
}

function slugFileName(name: string) {
  return name
    .toLowerCase()
    .replaceAll('ı','i').replaceAll('ğ','g').replaceAll('ü','u')
    .replaceAll('ş','s').replaceAll('ö','o').replaceAll('ç','c')
    .replace(/[^a-z0-9.]+/g, '-');
}

export default function Patient360Client({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<Row | null>(null);
  const [facility, setFacility] = useState<Row | null>(null);
  const [relatives, setRelatives] = useState<Row[]>([]);
  const [meds, setMeds] = useState<Row[]>([]);
  const [vitals, setVitals] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [docs, setDocs] = useState<Row[]>([]);
  const [reminders, setReminders] = useState<Row[]>([]);
  const [hospitalCases, setHospitalCases] = useState<Row[]>([]);
  const [incidents, setIncidents] = useState<Row[]>([]);
  const [timeline, setTimeline] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [quickNote, setQuickNote] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState('Medula');

  useEffect(() => { load(); }, [patientId]);

  async function load() {
    setLoading(true);

    const { data: p } = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
    setPatient(p || null);

    if (p?.facility_id) {
      const { data: f } = await supabase.from('facilities').select('*').eq('id', p.facility_id).maybeSingle();
      setFacility(f || null);
    }

    const safe = async (fn: () => any, fallback: any[] = []) => {
  try {
    const result = await fn();
    return result?.data || fallback;
  } catch {
    return fallback;
  }
};
    setRelatives(await safe(() => supabase.from('patient_relatives').select('*').eq('patient_id', patientId).order('is_primary', { ascending: false })));
    setMeds(await safe(() => supabase.from('patient_medicine_plans').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })));
    setVitals(await safe(() => supabase.from('vital_records').select('*').eq('patient_id', patientId).order('measured_at', { ascending: false }).limit(12)));
    setItems(await safe(() => supabase.from('patient_items').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(12)));
    setDocs(await safe(() => supabase.from('documents').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(12)));
    setHospitalCases(await safe(() => supabase.from('hospital_cases').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(8)));
    setIncidents(await safe(() => supabase.from('incident_records').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(8)));
    setTimeline(await safe(() => supabase.from('patient_timeline').select('*').eq('patient_id', patientId).order('event_date', { ascending: false }).limit(16)));

    try {
      const { data } = await supabase
        .from('reminder_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('remind_at', { ascending: true })
        .limit(10);
      setReminders(data || []);
    } catch {
      setReminders([]);
    }

    setLoading(false);
  }

  async function addTimeline(title: string, description: string, eventType = 'Hasta 360', sourceTable?: string, sourceId?: string) {
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

  async function saveQuickNote() {
    if (!patient) return;
    if (!quickNote.trim()) return alert('Not yaz.');

    const { error } = await supabase.from('patient_notes').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      note_type: 'Hızlı Not',
      title: 'Hasta 360 hızlı not',
      note: quickNote,
    });

    if (error) return alert(error.message);
    await addTimeline('Hızlı not eklendi', quickNote, 'Not');
    setQuickNote('');
    await load();
  }

  async function openDocument(row: Row) {
    if (!row.storage_path) return alert('Dosya yolu yok.');
    const { data, error } = await supabase.storage.from('patient-documents').createSignedUrl(row.storage_path, 60 * 10);
    if (error) return alert(error.message);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  async function uploadDoc() {
    if (!patient) return;
    if (!docFile) return alert('Dosya seç.');

    try {
      const path = `${patient.facility_id}/${patient.id}/${Date.now()}-${slugFileName(docFile.name)}`;
      const up = await supabase.storage.from('patient-documents').upload(path, docFile, { upsert: false });
      if (up.error) throw up.error;

      const ins = await supabase.from('documents').insert({
        facility_id: patient.facility_id,
        patient_id: patient.id,
        category: docCategory,
        title: docCategory,
        storage_path: path,
        note: docFile.name,
      }).select('id').single();

      if (ins.error) throw ins.error;
      await addTimeline(`${docCategory} yüklendi`, docFile.name, 'Evrak', 'documents', ins.data?.id);
      setDocFile(null);
      await load();
    } catch (e: any) {
      alert(e.message || 'Evrak yüklenemedi.');
    }
  }

  const activeMeds = meds.filter((m) => (m.status || 'Aktif') === 'Aktif');
  const stoppedMeds = meds.filter((m) => (m.status || 'Aktif') !== 'Aktif');
  const stockCritical = activeMeds.filter((m) => {
    const c = calcMed(m);
    return c.remainingDays !== null && c.remainingDays <= 30;
  });
  const reportCritical = activeMeds.filter((m) => {
    const c = calcMed(m);
    return c.reportDays !== null && c.reportDays <= 30;
  });
  const expiryCritical = activeMeds.filter((m) => {
    const c = calcMed(m);
    return c.expiryDays !== null && c.expiryDays <= 30;
  });

  const primaryRelative = relatives.find((r) => r.is_primary) || relatives[0];
  const latestVital = vitals[0];
  const latestVitalAlerts = latestVital ? vitalCritical(latestVital) : [];
  const activeHospital = hospitalCases.find((h) => h.status === 'Hastanede');
  const fallIncidents = incidents.filter((i) => String(i.incident_type || i.description || '').toLowerCase().includes('düş'));
  const lostItems = items.filter((i) => i.status === 'Kayıp');
  const valuableItems = items.filter((i) => i.category === 'Değerli Eşya');

  const smartAlerts = useMemo(() => {
    const arr: { icon: string; text: string; tone: string }[] = [];
    if (latestVitalAlerts.length) arr.push({ icon: '🔴', text: `Kritik vital: ${latestVitalAlerts.join(', ')}`, tone: 'danger' });
    if (stockCritical.length) arr.push({ icon: '🔴', text: `${stockCritical.length} ilacın stoku 30 gün içinde bitebilir`, tone: 'danger' });
    if (reportCritical.length) arr.push({ icon: '🟡', text: `${reportCritical.length} ilaç raporu yaklaşıyor`, tone: 'warn' });
    if (expiryCritical.length) arr.push({ icon: '🟠', text: `${expiryCritical.length} ilacın SKT tarihi yaklaşıyor`, tone: 'warn' });
    if (activeHospital) arr.push({ icon: '🏥', text: `Hasta hastanede: ${activeHospital.hospital_name || '-'}`, tone: 'blue' });
    if (lostItems.length) arr.push({ icon: '⚠️', text: `${lostItems.length} kayıp eşya kaydı var`, tone: 'warn' });
    if (!arr.length) arr.push({ icon: '🟢', text: 'Kritik uyarı yok', tone: 'ok' });
    return arr;
  }, [latestVitalAlerts.length, stockCritical.length, reportCritical.length, expiryCritical.length, activeHospital, lostItems.length]);

  return (
    <>
      <Shell>
        <div className="u360Back">
          <Link href="/patients">← Hasta listesine dön</Link>
        </div>

        {loading && <div className="u360Card">Yükleniyor...</div>}

        {!loading && (
          <div className="u360">
            <section className="u360Hero">
              <div className="u360HeroLeft">
                <div className="u360Avatar">{initials(patient?.full_name || '?')}</div>
                <div>
                  <div className="u360Label">Hasta 360° Dosyası</div>
                  <h1>{patient?.full_name || '-'}</h1>
                  <p>{ageFromBirthDate(patient?.birth_date)} • TC: {patient?.tc_no || '-'}</p>
                  <div className="u360Chips">
                    <span>🏢 {facility?.name || '-'}</span>
                    <span>🏠 Oda {patient?.room_no || '-'}</span>
                    <span>🛏 Yatak {patient?.bed_no || '-'}</span>
                    <span>🚨 Alarm {patient?.alarm_no || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="u360HeroRight">
                <div className="u360MiniStat danger">
                  <span>Kritik Uyarı</span>
                  <strong>{smartAlerts.filter((a) => a.tone === 'danger').length}</strong>
                </div>
                <div className="u360MiniStat">
                  <span>Aktif İlaç</span>
                  <strong>{activeMeds.length}</strong>
                </div>
                <div className="u360MiniStat">
                  <span>Yaklaşan Randevu</span>
                  <strong>{reminders.length}</strong>
                </div>
              </div>
            </section>

            <section className="u360Smart">
              {smartAlerts.map((a, idx) => (
                <div className={`u360Alert ${a.tone}`} key={idx}>
                  <b>{a.icon}</b>
                  <span>{a.text}</span>
                </div>
              ))}
            </section>

            <div className="u360GridTop">
              <section className="u360Card emergency">
                <div className="u360SectionHead">
                  <h2>🚑 Acil Durum Kartı</h2>
                  <span>Tek bakışta kritik bilgiler</span>
                </div>

                <div className="u360EmergencyGrid">
                  <Info label="Alerjiler" value={patient?.allergies || '-'} tone="danger" />
                  <Info label="Tanılar" value={patient?.diagnoses || '-'} />
                  <Info label="Doktor" value={patient?.doctor_name || '-'} />
                  <Info label="Yakını" value={`${primaryRelative?.full_name || patient?.relative_name || '-'} • ${primaryRelative?.phone || patient?.relative_phone || '-'}`} />
                  <Info label="Son Vital" value={latestVital ? `TA ${latestVital.systolic || '-'}/${latestVital.diastolic || '-'} • Nabız ${latestVital.pulse || '-'} • Ateş ${latestVital.temperature || '-'}` : '-'} />
                  <Info label="Hastane" value={activeHospital ? `${activeHospital.hospital_name || '-'} • ${activeHospital.reason || '-'}` : 'Hastanede değil'} tone={activeHospital ? 'blue' : ''} />
                </div>
              </section>

              <section className="u360Card risk">
                <div className="u360SectionHead">
                  <h2>🧠 Risk Paneli</h2>
                  <span>Akıllı özet</span>
                </div>

                <Risk label="İlaç Riski" value={stockCritical.length ? 'Yüksek' : activeMeds.length ? 'Düşük' : 'Düşük'} />
                <Risk label="Düşme Riski" value={fallIncidents.length ? 'Orta' : 'Düşük'} />
                <Risk label="Evrak Riski" value={docs.length ? 'Düşük' : 'Orta'} />
                <Risk label="Eşya Riski" value={lostItems.length ? 'Orta' : 'Düşük'} />
                <Risk label="Hastane Riski" value={activeHospital ? 'Yüksek' : 'Düşük'} />
              </section>
            </div>

            <div className="u360MainGrid">
              <section className="u360Card wide">
                <div className="u360SectionHead">
                  <h2>💊 Akıllı İlaç Merkezi</h2>
                  <span>Stok, rapor ve SKT uyarıları</span>
                </div>

                <div className="u360MedTable">
                  <div className="u360MedHeader">
                    <span>İlaç</span><span>Doz</span><span>Kalan</span><span>Stok</span><span>Rapor</span><span>SKT</span>
                  </div>
                  {activeMeds.slice(0, 8).map((m) => {
                    const c = calcMed(m);
                    return (
                      <div className="u360MedRow" key={m.id}>
                        <strong>{m.medicine_name || m.drug_name || '-'}</strong>
                        <span>{m.daily_dose || m.daily_use || '-'}</span>
                        <span>{c.remaining}</span>
                        <b className={alertTone(c.remainingDays)}>{c.remainingDays ?? '-'} gün</b>
                        <b className={alertTone(c.reportDays)}>{c.reportDays ?? '-'} gün</b>
                        <b className={alertTone(c.expiryDays)}>{c.expiryDays ?? '-'} gün</b>
                      </div>
                    );
                  })}
                  {!activeMeds.length && <div className="u360Empty">Aktif ilaç yok.</div>}
                </div>

                {stoppedMeds.length > 0 && (
                  <div className="u360Stopped">
                    <h3>Stoplanan İlaçlar</h3>
                    {stoppedMeds.slice(0, 4).map((m) => <p key={m.id}><b>{m.medicine_name}</b><span>{m.status} • {m.stop_reason || '-'}</span></p>)}
                  </div>
                )}
              </section>

              <section className="u360Card">
                <div className="u360SectionHead">
                  <h2>📅 Hatırlatıcılar</h2>
                  <span>Yaklaşan işler</span>
                </div>

                <div className="u360List">
                  {reminders.map((r) => (
                    <div className="u360ListItem" key={r.id}>
                      <b>{r.title || r.reminder_type || 'Hatırlatıcı'}</b>
                      <span>{fmtDateTime(r.remind_at)}</span>
                    </div>
                  ))}
                  {!reminders.length && <div className="u360Empty">Hatırlatıcı yok.</div>}
                </div>
              </section>

              <section className="u360Card">
                <div className="u360SectionHead">
                  <h2>📈 Son Vital</h2>
                  <span>Son ölçümler</span>
                </div>

                <div className="u360VitalGrid">
                  <Vital label="TA" value={latestVital ? `${latestVital.systolic || '-'}/${latestVital.diastolic || '-'}` : '-'} />
                  <Vital label="Nabız" value={latestVital?.pulse || '-'} />
                  <Vital label="Ateş" value={latestVital?.temperature || '-'} />
                  <Vital label="SpO₂" value={latestVital?.spo2 || '-'} />
                  <Vital label="Şeker" value={latestVital?.blood_sugar || '-'} />
                  <Vital label="Kilo" value={latestVital?.weight || '-'} />
                </div>
              </section>

              <section className="u360Card">
                <div className="u360SectionHead">
                  <h2>🧳 Eşya Takibi</h2>
                  <span>{items.length} kayıt</span>
                </div>

                <div className="u360ItemGrid">
                  {items.slice(0, 8).map((i) => (
                    <div className={`u360Item ${i.status === 'Kayıp' ? 'danger' : ''}`} key={i.id}>
                      <b>{i.item_name}</b>
                      <span>{i.category} • {i.quantity || 1} adet</span>
                      <small>{i.status || 'Teslim Alındı'}</small>
                    </div>
                  ))}
                  {!items.length && <div className="u360Empty">Eşya yok.</div>}
                </div>
              </section>

              <section className="u360Card">
                <div className="u360SectionHead">
                  <h2>📁 Belge Merkezi</h2>
                  <span>Kimlik, Medula, rapor</span>
                </div>

                <div className="u360DocUpload">
                  <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
                    <option>Medula</option>
                    <option>Kimlik</option>
                    <option>Sağlık Raporu</option>
                    <option>Epikriz</option>
                    <option>Reçete</option>
                    <option>Diğer Evrak</option>
                  </select>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                  <button onClick={uploadDoc}>Yükle</button>
                </div>

                <div className="u360Docs">
                  {docs.slice(0, 8).map((d) => (
                    <button key={d.id} onClick={() => openDocument(d)}>
                      <b>{d.category || 'Evrak'}</b>
                      <span>{d.title || d.note || 'Aç'}</span>
                    </button>
                  ))}
                  {!docs.length && <div className="u360Empty">Evrak yok.</div>}
                </div>
              </section>

              <section className="u360Card">
                <div className="u360SectionHead">
                  <h2>🏥 Hastane Merkezi</h2>
                  <span>Sevk ve dönüş</span>
                </div>

                <div className="u360List">
                  {hospitalCases.slice(0, 6).map((h) => (
                    <div className={`u360ListItem ${h.status === 'Hastanede' ? 'danger' : ''}`} key={h.id}>
                      <b>{h.hospital_name || '-'}</b>
                      <span>{h.reason || '-'} • {h.status || '-'}</span>
                      <small>{fmtDateTime(h.departure_at || h.created_at)}</small>
                    </div>
                  ))}
                  {!hospitalCases.length && <div className="u360Empty">Hastane kaydı yok.</div>}
                </div>
              </section>

              <section className="u360Card">
                <div className="u360SectionHead">
                  <h2>☎️ Yakın Bilgilendirme</h2>
                  <span>İletişim özeti</span>
                </div>

                <div className="u360RelativeBox">
                  <strong>{primaryRelative?.full_name || patient?.relative_name || '-'}</strong>
                  <p>{primaryRelative?.relation_type || 'Yakını'}</p>
                  <b>{primaryRelative?.phone || patient?.relative_phone || '-'}</b>
                </div>

                <textarea value={quickNote} onChange={(e) => setQuickNote(e.target.value)} placeholder="Yakın bilgilendirme / hızlı hasta notu..." />
                <button className="u360Primary" onClick={saveQuickNote}>Notu Kaydet</button>
              </section>

              <section className="u360Card timeline">
                <div className="u360SectionHead">
                  <h2>🕒 Zaman Tüneli</h2>
                  <span>Hasta ile ilgili tüm akış</span>
                </div>

                <div className="u360Timeline">
                  {timeline.map((t) => (
                    <div className="u360TimelineItem" key={t.id}>
                      <i />
                      <div>
                        <b>{t.title}</b>
                        <p>{t.description || t.event_type}</p>
                        <small>{fmtDateTime(t.event_date || t.created_at)}</small>
                      </div>
                    </div>
                  ))}
                  {!timeline.length && <div className="u360Empty">Zaman tüneli kaydı yok.</div>}
                </div>
              </section>
            </div>
          </div>
        )}
      </Shell>

      <style jsx global>{`
        .u360Back{margin-bottom:12px}.u360Back a{color:#2563eb;text-decoration:none;font-weight:900}
        .u360{display:flex;flex-direction:column;gap:16px}
        .u360Card,.u360Hero,.u360Smart{background:#fff;border:1px solid #e5e7eb;border-radius:24px;box-shadow:0 18px 40px rgba(15,23,42,.06)}
        .u360Hero{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:24px;background:linear-gradient(135deg,#ffffff,#f8fbff)}
        .u360HeroLeft{display:flex;align-items:center;gap:18px}
        .u360Avatar{width:104px;height:104px;border-radius:28px;background:linear-gradient(135deg,#1d4ed8,#38bdf8);color:white;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:1000;box-shadow:0 18px 34px rgba(37,99,235,.25)}
        .u360Label{color:#2563eb;font-weight:1000;text-transform:uppercase;font-size:12px;letter-spacing:.08em}
        .u360Hero h1{margin:4px 0 0;color:#0f172a;font-size:38px;font-weight:1000;letter-spacing:-.04em}
        .u360Hero p{margin:6px 0 0;color:#64748b;font-weight:800}
        .u360Chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.u360Chips span{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:7px 10px;font-weight:900;font-size:13px}
        .u360HeroRight{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.u360MiniStat{min-width:118px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:14px}.u360MiniStat span{display:block;color:#64748b;font-size:12px;font-weight:900}.u360MiniStat strong{display:block;color:#0f172a;font-size:30px;margin-top:4px}.u360MiniStat.danger{background:#fef2f2;border-color:#fecaca}.u360MiniStat.danger strong{color:#dc2626}
        .u360Smart{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:12px}.u360Alert{display:flex;align-items:center;gap:10px;border-radius:16px;padding:12px;font-weight:900}.u360Alert.ok{background:#f0fdf4;color:#166534}.u360Alert.warn{background:#fffbeb;color:#92400e}.u360Alert.danger{background:#fef2f2;color:#991b1b}.u360Alert.blue{background:#eff6ff;color:#1d4ed8}
        .u360GridTop{display:grid;grid-template-columns:2fr 1fr;gap:16px}.u360Card{padding:18px}.u360SectionHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.u360SectionHead h2{margin:0;color:#0f172a;font-size:19px;font-weight:1000}.u360SectionHead span{color:#64748b;font-size:13px;font-weight:800}
        .u360EmergencyGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.u360Info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:13px}.u360Info.danger{background:#fef2f2;border-color:#fecaca}.u360Info.blue{background:#eff6ff;border-color:#bfdbfe}.u360Info span{display:block;color:#64748b;font-size:12px;font-weight:1000}.u360Info b{display:block;color:#0f172a;margin-top:6px;line-height:1.35}
        .u360Risk{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding:10px 0}.u360Risk span{font-weight:900;color:#334155}.u360Risk b{border-radius:999px;padding:5px 10px;font-size:12px}.u360Risk.ok b{background:#dcfce7;color:#166534}.u360Risk.warn b{background:#fef3c7;color:#92400e}.u360Risk.danger b{background:#fee2e2;color:#991b1b}
        .u360MainGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.u360Card.wide{grid-column:span 2}.u360Card.timeline{grid-column:span 2}
        .u360MedTable{border:1px solid #e5e7eb;border-radius:18px;overflow:hidden}.u360MedHeader,.u360MedRow{display:grid;grid-template-columns:2fr .8fr .8fr .8fr .8fr .8fr;gap:10px;align-items:center;padding:12px}.u360MedHeader{background:#f8fafc;color:#64748b;font-size:12px;font-weight:1000;text-transform:uppercase}.u360MedRow{border-top:1px solid #f1f5f9}.u360MedRow strong{color:#0f172a}.u360MedRow span{color:#475569}.u360MedRow b{border-radius:999px;padding:5px 8px;text-align:center;font-size:12px}.u360MedRow b.ok{background:#dcfce7;color:#166534}.u360MedRow b.warn{background:#fef3c7;color:#92400e}.u360MedRow b.danger{background:#fee2e2;color:#991b1b}.u360MedRow b.muted{background:#f1f5f9;color:#475569}
        .u360Stopped{margin-top:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:12px}.u360Stopped h3{margin:0 0 8px;color:#0f172a}.u360Stopped p{display:flex;justify-content:space-between;gap:10px;margin:7px 0;color:#64748b}.u360Stopped b{color:#0f172a}
        .u360List,.u360Timeline{display:flex;flex-direction:column;gap:10px}.u360ListItem{border:1px solid #e5e7eb;border-radius:16px;padding:12px;background:#fff}.u360ListItem.danger{background:#fef2f2;border-color:#fecaca}.u360ListItem b{display:block;color:#0f172a}.u360ListItem span,.u360ListItem small{display:block;color:#64748b;margin-top:4px}
        .u360VitalGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.u360Vital{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px}.u360Vital span{display:block;color:#64748b;font-size:12px;font-weight:1000}.u360Vital b{display:block;color:#0f172a;font-size:24px;margin-top:5px}
        .u360ItemGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.u360Item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:12px}.u360Item.danger{background:#fef2f2;border-color:#fecaca}.u360Item b{display:block;color:#0f172a}.u360Item span,.u360Item small{display:block;color:#64748b;margin-top:4px}
        .u360DocUpload{display:grid;grid-template-columns:1fr 1.4fr auto;gap:8px;margin-bottom:12px}.u360DocUpload select,.u360DocUpload input{height:38px;border:1px solid #cbd5e1;border-radius:12px;padding:0 10px}.u360DocUpload button,.u360Primary{height:38px;border:none;border-radius:12px;background:#2563eb;color:white;font-weight:1000;padding:0 14px;cursor:pointer}
        .u360Docs{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.u360Docs button{border:1px solid #e5e7eb;background:#f8fafc;border-radius:14px;padding:11px;text-align:left;cursor:pointer}.u360Docs b{display:block;color:#0f172a}.u360Docs span{display:block;color:#64748b;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .u360RelativeBox{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px;margin-bottom:10px}.u360RelativeBox strong{display:block;color:#0f172a;font-size:18px}.u360RelativeBox p{margin:4px 0;color:#64748b}.u360RelativeBox b{color:#1d4ed8}.u360Card textarea{width:100%;height:86px;border:1px solid #cbd5e1;border-radius:16px;padding:12px;resize:vertical;margin-bottom:10px}
        .u360TimelineItem{display:grid;grid-template-columns:16px 1fr;gap:12px}.u360TimelineItem i{width:13px;height:13px;border-radius:999px;background:#2563eb;margin-top:5px;box-shadow:0 0 0 5px #dbeafe}.u360TimelineItem b{display:block;color:#0f172a}.u360TimelineItem p{margin:4px 0;color:#475569}.u360TimelineItem small{color:#64748b}
        .u360Empty{background:#f8fafc;border:1px dashed #cbd5e1;color:#64748b;border-radius:16px;padding:14px;font-weight:900;text-align:center}
        @media(max-width:1300px){.u360Hero{flex-direction:column;align-items:stretch}.u360HeroRight{grid-template-columns:repeat(3,1fr)}.u360Smart{grid-template-columns:repeat(2,1fr)}.u360GridTop,.u360MainGrid{grid-template-columns:1fr}.u360Card.wide,.u360Card.timeline{grid-column:span 1}.u360EmergencyGrid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:760px){.u360HeroLeft{flex-direction:column;align-items:flex-start}.u360Hero h1{font-size:30px}.u360HeroRight,.u360Smart,.u360EmergencyGrid,.u360VitalGrid,.u360ItemGrid,.u360Docs,.u360DocUpload{grid-template-columns:1fr}.u360MedHeader{display:none}.u360MedRow{grid-template-columns:1fr 1fr}.u360MedRow strong{grid-column:span 2}}
      `}</style>
    </>
  );
}

function Info({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return <div className={`u360Info ${tone}`}><span>{label}</span><b>{value}</b></div>;
}

function Risk({ label, value }: { label: string; value: string }) {
  const tone = value === 'Yüksek' ? 'danger' : value === 'Orta' ? 'warn' : 'ok';
  return <div className={`u360Risk ${tone}`}><span>{label}</span><b>{value}</b></div>;
}

function Vital({ label, value }: { label: string; value: any }) {
  return <div className="u360Vital"><span>{label}</span><b>{value || '-'}</b></div>;
}
