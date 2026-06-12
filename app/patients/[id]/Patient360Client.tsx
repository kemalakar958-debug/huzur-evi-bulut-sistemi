'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Row = Record<string, any>;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  if (!from || !to) return null;
  const a = new Date(from + 'T00:00:00').getTime();
  const b = new Date(to + 'T00:00:00').getTime();
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

function addDays(date: string, days: number) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(value: any) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('tr-TR');
  } catch {
    return '-';
  }
}

function statusClass(days: number | null) {
  if (days === null) return 'neutral';
  if (days <= 10) return 'danger';
  if (days <= 30) return 'warn';
  return 'ok';
}

export default function Patient360Client({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<Row | null>(null);
  const [meds, setMeds] = useState<Row[]>([]);
  const [vitals, setVitals] = useState<Row[]>([]);
  const [incidents, setIncidents] = useState<Row[]>([]);
  const [hospitalCases, setHospitalCases] = useState<Row[]>([]);
  const [reminders, setReminders] = useState<Row[]>([]);

  const [form, setForm] = useState({
    medicine_name: '',
    start_date: todayIso(),
    initial_stock: '',
    daily_dose: '',
    expiry_date: '',
    report_start_date: todayIso(),
    report_end_date: '',
    note: '',
  });

  useEffect(() => {
    load();
  }, [patientId]);

  async function safeSelect(table: string, limit = 5) {
    try {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch {
      return [];
    }
  }

  async function load() {
    const { data: p } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .maybeSingle();

    setPatient(p || null);

    const { data: medRows } = await supabase
      .from('patient_medicine_plans')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    setMeds(medRows || []);
    setVitals(await safeSelect('vital_records', 5));
    setIncidents(await safeSelect('incident_records', 5));
    setHospitalCases(await safeSelect('hospital_cases', 5));

    try {
      const { data: reminderRows } = await supabase
        .from('reminder_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('remind_at', { ascending: true })
        .limit(5);

      setReminders(reminderRows || []);
    } catch {
      setReminders([]);
    }
  }

  function calcMedicine(row: Row) {
    const daily = Number(row.daily_dose || 0);
    const initial = Number(row.initial_stock || 0);
    const start = row.start_date || todayIso();

    const passed = Math.max(0, daysBetween(start, todayIso()) || 0);
    const used = daily * passed;
    const remaining = Math.max(0, initial - used);
    const remainingDays = daily > 0 ? Math.floor(remaining / daily) : null;
    const estimatedEndDate = remainingDays !== null ? addDays(todayIso(), remainingDays) : null;

    const expiryDays = row.expiry_date ? daysBetween(todayIso(), row.expiry_date) : null;
    const reportDays = row.report_end_date ? daysBetween(todayIso(), row.report_end_date) : null;

    return { used, remaining, remainingDays, estimatedEndDate, expiryDays, reportDays };
  }

  async function saveMedicine() {
    if (!patient) return;
    if (!form.medicine_name) return alert('İlaç adı yaz.');
    if (!form.initial_stock) return alert('Başlangıç stok yaz.');
    if (!form.daily_dose) return alert('Günlük doz yaz.');

    const { error } = await supabase.from('patient_medicine_plans').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      patient_name: patient.full_name,
      medicine_name: form.medicine_name,
      start_date: form.start_date || todayIso(),
      initial_stock: Number(form.initial_stock || 0),
      daily_dose: Number(form.daily_dose || 0),
      expiry_date: form.expiry_date || null,
      report_start_date: form.report_start_date || null,
      report_end_date: form.report_end_date || null,
      note: form.note || null,
      status: 'Aktif',
    });

    if (error) return alert(error.message);

    setForm({
      medicine_name: '',
      start_date: todayIso(),
      initial_stock: '',
      daily_dose: '',
      expiry_date: '',
      report_start_date: todayIso(),
      report_end_date: '',
      note: '',
    });

    await load();
  }

  async function updateMedicineStatus(row: Row, status: string) {
    const { error } = await supabase
      .from('patient_medicine_plans')
      .update({ status })
      .eq('id', row.id);

    if (error) return alert(error.message);
    await load();
  }

  async function deleteMedicine(row: Row) {
    if (!confirm('Bu ilaç kaydı silinsin mi?')) return;

    const { error } = await supabase
      .from('patient_medicine_plans')
      .delete()
      .eq('id', row.id);

    if (error) return alert(error.message);
    await load();
  }

  const activeMeds = meds.filter((m) => (m.status || 'Aktif') === 'Aktif');
  const stockWarnings = activeMeds.filter((m) => {
    const c = calcMedicine(m);
    return c.remainingDays !== null && c.remainingDays <= 30;
  });
  const reportWarnings = activeMeds.filter((m) => {
    const c = calcMedicine(m);
    return c.reportDays !== null && c.reportDays <= 30;
  });
  const expiryWarnings = activeMeds.filter((m) => {
    const c = calcMedicine(m);
    return c.expiryDays !== null && c.expiryDays <= 30;
  });

  return (
    <>
      <Shell>
        <div className="p360Hero">
          <div>
            <Link href="/patients">← Hasta Listesine Dön</Link>
            <h2>{patient?.full_name || 'Hasta Dosyası'}</h2>
            <p>Hasta 360° dosyası: ilaç stok, rapor, SKT, hastane ve olay geçmişi.</p>
          </div>
          <div className="p360PatientBox">
            <span>Durum</span>
            <strong>{patient?.status || 'Aktif'}</strong>
          </div>
        </div>

        <div className="p360Stats">
          <Stat title="Aktif İlaç" value={activeMeds.length} />
          <Stat title="Stok Uyarısı" value={stockWarnings.length} />
          <Stat title="Rapor Uyarısı" value={reportWarnings.length} />
          <Stat title="SKT Uyarısı" value={expiryWarnings.length} />
          <Stat title="Olay Geçmişi" value={incidents.length} />
          <Stat title="Hastane Süreci" value={hospitalCases.length} />
        </div>

        {(stockWarnings.length > 0 || reportWarnings.length > 0 || expiryWarnings.length > 0) && (
          <div className="p360AlertPanel">
            <h3>Görsel Uyarılar</h3>
            <div className="p360AlertGrid">
              {stockWarnings.map((m) => {
                const c = calcMedicine(m);
                return <AlertCard key={`stock-${m.id}`} type="Stok" title={m.medicine_name} desc={`${c.remainingDays} gün sonra stok bitebilir`} tone={statusClass(c.remainingDays)} />;
              })}

              {reportWarnings.map((m) => {
                const c = calcMedicine(m);
                return <AlertCard key={`report-${m.id}`} type="Rapor" title={m.medicine_name} desc={`${c.reportDays} gün sonra rapor bitebilir`} tone={statusClass(c.reportDays)} />;
              })}

              {expiryWarnings.map((m) => {
                const c = calcMedicine(m);
                return <AlertCard key={`expiry-${m.id}`} type="SKT" title={m.medicine_name} desc={`${c.expiryDays} gün sonra son kullanma tarihi`} tone={statusClass(c.expiryDays)} />;
              })}
            </div>
          </div>
        )}

        <div className="p360Grid2">
          <div className="p360Panel">
            <h3>Yeni İlaç / Stok Planı</h3>

            <div className="p360FormGrid">
              <div><label>İlaç Adı</label><input value={form.medicine_name} onChange={(e) => setForm({ ...form, medicine_name: e.target.value })} /></div>
              <div><label>İlaç Başlangıç Tarihi</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><label>Başlangıç Stok</label><input type="number" value={form.initial_stock} onChange={(e) => setForm({ ...form, initial_stock: e.target.value })} placeholder="Örn: 112" /></div>
              <div><label>Günlük Doz</label><input type="number" step="0.01" value={form.daily_dose} onChange={(e) => setForm({ ...form, daily_dose: e.target.value })} placeholder="Örn: 2" /></div>
              <div><label>Son Kullanma Tarihi</label><input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
              <div><label>Rapor Başlangıç</label><input type="date" value={form.report_start_date} onChange={(e) => setForm({ ...form, report_start_date: e.target.value })} /></div>
              <div><label>Rapor Bitiş</label><input type="date" value={form.report_end_date} onChange={(e) => setForm({ ...form, report_end_date: e.target.value })} /></div>
              <div><label>Not</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            </div>

            <button className="p360Primary" onClick={saveMedicine}>İlaç Planı Kaydet</button>
          </div>

          <div className="p360Panel">
            <h3>Hasta Bilgi Özeti</h3>
            <div className="p360Info">
              <p><b>TC:</b> {patient?.tc_no || '-'}</p>
              <p><b>Doğum Tarihi:</b> {fmtDate(patient?.birth_date)}</p>
              <p><b>Oda/Yatak:</b> {patient?.room_no || '-'} / {patient?.bed_no || '-'}</p>
              <p><b>Yakın:</b> {patient?.relative_name || '-'} {patient?.relative_phone ? `• ${patient.relative_phone}` : ''}</p>
              <p><b>Doktor:</b> {patient?.doctor_name || '-'}</p>
              <p><b>Tanılar:</b> {patient?.diagnoses || '-'}</p>
              <p><b>Alerjiler:</b> {patient?.allergies || '-'}</p>
            </div>
          </div>
        </div>

        <div className="p360Panel">
          <div className="p360PanelHead">
            <h3>İlaç Stok ve Rapor Takibi</h3>
            <span>Stok, SKT ve rapor tarihleri ayrı hesaplanır.</span>
          </div>

          <div className="p360TableWrap">
            <table className="p360Table">
              <thead>
                <tr>
                  <th>İlaç</th><th>Günlük Doz</th><th>Başlangıç Stok</th><th>Kalan Stok</th><th>Stok Bitiş</th><th>SKT</th><th>Rapor Bitiş</th><th>Durum</th><th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((m) => {
                  const c = calcMedicine(m);
                  return (
                    <tr key={m.id}>
                      <td><b>{m.medicine_name}</b><br /><small>{m.note || '-'}</small></td>
                      <td>{m.daily_dose}</td>
                      <td>{m.initial_stock}</td>
                      <td><span className={`p360Badge ${statusClass(c.remainingDays)}`}>{c.remaining}</span><br /><small>{c.remainingDays !== null ? `${c.remainingDays} gün` : '-'}</small></td>
                      <td>{c.estimatedEndDate ? fmtDate(c.estimatedEndDate) : '-'}</td>
                      <td><span className={`p360Badge ${statusClass(c.expiryDays)}`}>{m.expiry_date ? fmtDate(m.expiry_date) : '-'}</span><br /><small>{c.expiryDays !== null ? `${c.expiryDays} gün` : '-'}</small></td>
                      <td><span className={`p360Badge ${statusClass(c.reportDays)}`}>{m.report_end_date ? fmtDate(m.report_end_date) : '-'}</span><br /><small>{c.reportDays !== null ? `${c.reportDays} gün` : '-'}</small></td>
                      <td>{m.status || 'Aktif'}</td>
                      <td><div className="p360Actions"><select value={m.status || 'Aktif'} onChange={(e) => updateMedicineStatus(m, e.target.value)}><option>Aktif</option><option>Pasif</option><option>Bitti</option><option>Doktor Stop</option></select><button onClick={() => deleteMedicine(m)}>Sil</button></div></td>
                    </tr>
                  );
                })}
                {meds.length === 0 && <tr><td colSpan={9}>İlaç kaydı yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p360Grid4">
          <HistoryPanel title="Son Vital" rows={vitals} primary="created_at" secondary="note" />
          <HistoryPanel title="Son Olaylar" rows={incidents} primary="incident_type" secondary="description" />
          <HistoryPanel title="Hastane Süreçleri" rows={hospitalCases} primary="hospital_name" secondary="status" />
          <HistoryPanel title="Hatırlatıcılar" rows={reminders} primary="title" secondary="reminder_type" />
        </div>
      </Shell>

      <style jsx global>{`
        .p360Hero{display:flex;justify-content:space-between;gap:16px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-bottom:16px}.p360Hero a{color:#2563eb;text-decoration:none;font-weight:800}.p360Hero h2{margin:8px 0 0;color:#0f172a;font-size:30px;font-weight:900}.p360Hero p{margin:6px 0 0;color:#64748b}.p360PatientBox{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:12px 16px;min-width:160px}.p360PatientBox span{display:block;color:#64748b;font-size:12px;font-weight:900}.p360PatientBox strong{display:block;color:#0f172a;font-size:18px;margin-top:4px}
        .p360Stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-bottom:16px}.p360Stat{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px}.p360Stat span{display:block;color:#64748b;font-size:13px;font-weight:800}.p360Stat strong{display:block;color:#0f172a;font-size:30px;margin-top:8px}
        .p360AlertPanel,.p360Panel{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px;margin-bottom:16px}.p360AlertPanel h3,.p360Panel h3{margin:0 0 14px;color:#0f172a;font-size:20px}.p360AlertGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        .p360Alert{border-radius:16px;padding:14px;border:1px solid #e5e7eb}.p360Alert.ok{background:#f0fdf4;border-color:#bbf7d0}.p360Alert.warn{background:#fffbeb;border-color:#fde68a}.p360Alert.danger{background:#fef2f2;border-color:#fecaca}.p360Alert.neutral{background:#f8fafc}.p360Alert span{font-size:12px;font-weight:900;color:#64748b}.p360Alert strong{display:block;margin-top:5px;color:#0f172a}.p360Alert p{margin:5px 0 0;color:#475569}
        .p360Grid2{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px}.p360FormGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:12px}.p360Panel label{display:block;color:#475569;font-size:13px;font-weight:800;margin-bottom:6px}.p360Panel input,.p360Panel select{width:100%;height:42px;border:1px solid #cbd5e1;border-radius:12px;padding:0 10px;background:white;color:#0f172a}.p360Primary{height:44px;border:none;border-radius:12px;background:#2563eb;color:white;font-weight:900;padding:0 18px;cursor:pointer}.p360Info p{margin:0 0 10px;color:#334155}
        .p360PanelHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.p360PanelHead h3{margin:0}.p360PanelHead span{color:#64748b;font-size:13px;font-weight:700}.p360TableWrap{overflow:auto}.p360Table{width:100%;border-collapse:collapse}.p360Table th,.p360Table td{border-bottom:1px solid #e5e7eb;text-align:left;padding:10px;vertical-align:top;font-size:14px}.p360Table th{background:#f8fafc;color:#475569;font-size:12px;text-transform:uppercase}
        .p360Badge{display:inline-block;padding:4px 8px;border-radius:999px;font-weight:900;font-size:12px;background:#f1f5f9;color:#334155}.p360Badge.ok{background:#dcfce7;color:#166534}.p360Badge.warn{background:#fef3c7;color:#92400e}.p360Badge.danger{background:#fee2e2;color:#991b1b}.p360Actions{display:flex;gap:8px}.p360Actions select{height:34px}.p360Actions button{height:34px;border:none;border-radius:10px;background:#fee2e2;color:#991b1b;font-weight:800;padding:0 10px;cursor:pointer}
        .p360Grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.p360History{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px}.p360History h3{margin:0 0 12px;color:#0f172a}.p360HistoryRow{border-top:1px solid #f1f5f9;padding:10px 0}.p360HistoryRow:first-of-type{border-top:none}.p360HistoryRow b{display:block;color:#0f172a}.p360HistoryRow span{display:block;color:#64748b;font-size:13px;margin-top:3px}.p360Empty{color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px}
        @media(max-width:1200px){.p360Stats{grid-template-columns:repeat(3,minmax(0,1fr))}.p360Grid2,.p360Grid4{grid-template-columns:1fr}.p360AlertGrid,.p360FormGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.p360Stats,.p360AlertGrid,.p360FormGrid{grid-template-columns:1fr}.p360Hero{flex-direction:column}}
      `}</style>
    </>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return <div className="p360Stat"><span>{title}</span><strong>{value}</strong></div>;
}

function AlertCard({ type, title, desc, tone }: { type: string; title: string; desc: string; tone: string }) {
  return <div className={`p360Alert ${tone}`}><span>{type} Uyarısı</span><strong>{title}</strong><p>{desc}</p></div>;
}

function HistoryPanel({ title, rows, primary, secondary }: { title: string; rows: Row[]; primary: string; secondary: string }) {
  return (
    <div className="p360History">
      <h3>{title}</h3>
      {rows.map((r) => (
        <div className="p360HistoryRow" key={r.id}>
          <b>{primary.includes('at') || primary.includes('date') || primary === 'created_at' ? fmtDate(r[primary]) : r[primary] || '-'}</b>
          <span>{r[secondary] || '-'}</span>
        </div>
      ))}
      {rows.length === 0 && <div className="p360Empty">Kayıt yok.</div>}
    </div>
  );
}
