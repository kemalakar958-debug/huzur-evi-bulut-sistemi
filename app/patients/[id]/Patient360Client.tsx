'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Row = Record<string, any>;

function fmtDate(value: any) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('tr-TR');
  } catch {
    return '-';
  }
}

function fmtDateTime(value: any) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('tr-TR');
  } catch {
    return '-';
  }
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

function patientInitials(name: string) {
  const parts = (name || '?').split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function daysBetweenToday(dateValue: string | null) {
  if (!dateValue) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function calcMedicine(row: Row) {
  const start = row.start_date || new Date().toISOString().slice(0, 10);
  const startDate = new Date(`${start}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daily = Number(row.daily_dose || 0);
  const initial = Number(row.initial_stock || 0);
  const daysPassed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const remaining = Math.max(0, initial - daily * daysPassed);
  const remainingDays = daily > 0 ? Math.floor(remaining / daily) : null;
  const reportDays = daysBetweenToday(row.report_end_date);
  const expiryDays = daysBetweenToday(row.expiry_date);

  return { remaining, remainingDays, reportDays, expiryDays };
}

function riskTone(value: string) {
  if (value === 'Yüksek') return 'danger';
  if (value === 'Orta') return 'warn';
  return 'ok';
}

function itemTone(status: string) {
  if (status === 'Kayıp') return 'danger';
  if (status === 'Teslim Edildi') return 'gray';
  if (status === 'Kullanımda') return 'blue';
  return 'ok';
}

export default function Patient360Client({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<Row | null>(null);
  const [facility, setFacility] = useState<Row | null>(null);
  const [relatives, setRelatives] = useState<Row[]>([]);
  const [medicinePlans, setMedicinePlans] = useState<Row[]>([]);
  const [reminders, setReminders] = useState<Row[]>([]);
  const [incidents, setIncidents] = useState<Row[]>([]);
  const [hospitalCases, setHospitalCases] = useState<Row[]>([]);
  const [notes, setNotes] = useState<Row[]>([]);
  const [risk, setRisk] = useState<Row | null>(null);
  const [timeline, setTimeline] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [itemForm, setItemForm] = useState({
    category: 'Kıyafet',
    item_name: '',
    quantity: '1',
    description: '',
    delivered_by: '',
    delivered_at: todayIso(),
    status: 'Teslim Alındı',
    note: '',
  });

  useEffect(() => {
    load();
  }, [patientId]);

  async function load() {
    setLoading(true);

    const { data: patientRow } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .maybeSingle();

    setPatient(patientRow || null);

    if (patientRow?.facility_id) {
      const { data: facilityRow } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', patientRow.facility_id)
        .maybeSingle();

      setFacility(facilityRow || null);
    }

    const { data: itemRows } = await supabase
      .from('patient_items')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    setItems(itemRows || []);

    const { data: relativeRows } = await supabase
      .from('patient_relatives')
      .select('*')
      .eq('patient_id', patientId)
      .order('is_primary', { ascending: false });

    setRelatives(relativeRows || []);

    try {
      const { data: medRows } = await supabase
        .from('patient_medicine_plans')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      setMedicinePlans(medRows || []);
    } catch {
      setMedicinePlans([]);
    }

    try {
      const { data: reminderRows } = await supabase
        .from('reminder_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('remind_at', { ascending: true })
        .limit(6);

      setReminders(reminderRows || []);
    } catch {
      setReminders([]);
    }

    try {
      const { data: incidentRows } = await supabase
        .from('incident_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(6);

      setIncidents(incidentRows || []);
    } catch {
      setIncidents([]);
    }

    try {
      const { data: hospitalRows } = await supabase
        .from('hospital_cases')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(6);

      setHospitalCases(hospitalRows || []);
    } catch {
      setHospitalCases([]);
    }

    const { data: noteRows } = await supabase
      .from('patient_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(6);

    setNotes(noteRows || []);

    const { data: riskRow } = await supabase
      .from('patient_risk_scores')
      .select('*')
      .eq('patient_id', patientId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setRisk(riskRow || null);

    const { data: timelineRows } = await supabase
      .from('patient_timeline')
      .select('*')
      .eq('patient_id', patientId)
      .order('event_date', { ascending: false })
      .limit(10);

    setTimeline(timelineRows || []);

    setLoading(false);
  }

  async function createItem() {
    if (!patient) return;
    if (!itemForm.item_name) return alert('Eşya adı yaz.');

    const { data, error } = await supabase
      .from('patient_items')
      .insert({
        facility_id: patient.facility_id,
        patient_id: patient.id,
        category: itemForm.category,
        item_name: itemForm.item_name,
        quantity: Number(itemForm.quantity || 1),
        description: itemForm.description || null,
        delivered_by: itemForm.delivered_by || null,
        delivered_at: itemForm.delivered_at || todayIso(),
        status: itemForm.status,
        note: itemForm.note || null,
      })
      .select('id')
      .single();

    if (error) return alert(error.message);

    await supabase.from('patient_timeline').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      event_type: 'Eşya Kaydı',
      title: `${itemForm.item_name} eşyası eklendi`,
      description: `${itemForm.category} • ${itemForm.quantity || 1} adet • ${itemForm.status}`,
      event_date: new Date().toISOString(),
      source_table: 'patient_items',
      source_id: data?.id || null,
    });

    setItemForm({
      category: 'Kıyafet',
      item_name: '',
      quantity: '1',
      description: '',
      delivered_by: '',
      delivered_at: todayIso(),
      status: 'Teslim Alındı',
      note: '',
    });

    await load();
  }

  async function updateItemStatus(row: Row, status: string) {
    if (!patient) return;

    const { error } = await supabase
      .from('patient_items')
      .update({ status })
      .eq('id', row.id);

    if (error) return alert(error.message);

    await supabase.from('patient_timeline').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      event_type: 'Eşya Durumu',
      title: `${row.item_name} durumu değişti`,
      description: `Yeni durum: ${status}`,
      event_date: new Date().toISOString(),
      source_table: 'patient_items',
      source_id: row.id,
    });

    await load();
  }

  async function deleteItem(row: Row) {
    if (!patient) return;
    if (!confirm('Bu eşya kaydı silinsin mi?')) return;

    const { error } = await supabase
      .from('patient_items')
      .delete()
      .eq('id', row.id);

    if (error) return alert(error.message);

    await supabase.from('patient_timeline').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      event_type: 'Eşya Silindi',
      title: `${row.item_name} eşya kaydı silindi`,
      description: row.category || '',
      event_date: new Date().toISOString(),
    });

    await load();
  }

  async function createRelative() {
    if (!patient) return;
    const name = prompt('Yakın adı soyadı:');
    if (!name) return;
    const phone = prompt('Telefon:') || '';
    const relation = prompt('Yakınlık derecesi:') || 'Yakını';

    const { error } = await supabase.from('patient_relatives').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      full_name: name,
      phone,
      relation_type: relation,
      is_primary: relatives.length === 0,
    });

    if (error) return alert(error.message);
    await load();
  }

  async function createNote() {
    if (!patient) return;
    const title = prompt('Not başlığı:') || 'Hasta Notu';
    const note = prompt('Not:');
    if (!note) return;

    const { error } = await supabase.from('patient_notes').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      title,
      note,
      note_type: 'Genel Not',
    });

    if (error) return alert(error.message);
    await load();
  }

  async function createTimelineEvent() {
    if (!patient) return;
    const title = prompt('Zaman tüneli başlığı:');
    if (!title) return;
    const description = prompt('Açıklama:') || '';

    const { error } = await supabase.from('patient_timeline').insert({
      facility_id: patient.facility_id,
      patient_id: patient.id,
      event_type: 'Manuel Kayıt',
      title,
      description,
      event_date: new Date().toISOString(),
    });

    if (error) return alert(error.message);
    await load();
  }

  const activeMeds = medicinePlans.filter((m) => (m.status || 'Aktif') === 'Aktif');
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

  const primaryRelative = relatives.find((r) => r.is_primary) || relatives[0];
  const itemSummary = {
    total: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    lost: items.filter((item) => item.status === 'Kayıp').length,
    valuable: items.filter((item) => item.category === 'Değerli Eşya').length,
  };

  return (
    <>
      <Shell>
        <div className="p2Header">
          <div>
            <Link href="/patients">← Hasta Listesine Dön</Link>
            <h2>{patient?.full_name || 'Hasta 360 Dosyası'}</h2>
            <p>{facility?.name || 'Kurum'} • Oda {patient?.room_no || '-'} / Yatak {patient?.bed_no || '-'}</p>
          </div>
          <div className="p2HeaderActions">
            <Link href="/patients/new">+ Yeni Hasta</Link>
            <button onClick={createTimelineEvent}>+ Zaman Kaydı</button>
            <button onClick={createNote}>+ Not</button>
          </div>
        </div>

        {loading && <div className="p2Panel">Yükleniyor...</div>}

        {!loading && (
          <>
            <div className="p2TopGrid">
              <section className="p2PatientCard">
                <div className="p2Avatar">{patientInitials(patient?.full_name || '?')}</div>
                <h3>{patient?.full_name || '-'}</h3>
                <span className="p2Status">{patient?.status || 'Aktif'}</span>
                <div className="p2InfoRows">
                  <p><b>TC:</b> {patient?.tc_no || '-'}</p>
                  <p><b>Yaş:</b> {ageFromBirthDate(patient?.birth_date)}</p>
                  <p><b>Doğum:</b> {fmtDate(patient?.birth_date)}</p>
                  <p><b>Alarm:</b> {patient?.alarm_no || '-'}</p>
                  <p><b>Doktor:</b> {patient?.doctor_name || '-'}</p>
                </div>
              </section>

              <section className="p2Panel">
                <div className="p2PanelHead">
                  <h3>Yakın Bilgileri</h3>
                  <button onClick={createRelative}>+ Yakın</button>
                </div>
                {primaryRelative ? (
                  <div className="p2RelativeBig">
                    <strong>{primaryRelative.full_name}</strong>
                    <span>{primaryRelative.relation_type || 'Yakını'}</span>
                    <p>{primaryRelative.phone || '-'}</p>
                  </div>
                ) : <div className="p2Empty">Yakın bilgisi eklenmemiş.</div>}
              </section>

              <section className="p2Panel">
                <h3>Sağlık Özeti</h3>
                <div className="p2Health">
                  <p><b>Tanılar</b><span>{patient?.diagnoses || '-'}</span></p>
                  <p><b>Alerjiler</b><span>{patient?.allergies || '-'}</span></p>
                  <p><b>Aktif İlaç</b><span>{activeMeds.length}</span></p>
                  <p><b>Eşya</b><span>{itemSummary.total}</span></p>
                </div>
              </section>

              <section className="p2Panel">
                <h3>Risk Paneli</h3>
                <RiskRow label="İlaç Riski" value={risk?.medicine_risk || (stockWarnings.length ? 'Orta' : 'Düşük')} />
                <RiskRow label="Düşme Riski" value={risk?.fall_risk || (incidents.length ? 'Orta' : 'Düşük')} />
                <RiskRow label="Eşya Riski" value={itemSummary.lost ? 'Orta' : 'Düşük'} />
              </section>
            </div>

            <div className="p2Stats">
              <Stat title="Aktif İlaç" value={activeMeds.length} />
              <Stat title="Stok Uyarısı" value={stockWarnings.length} danger={stockWarnings.length > 0} />
              <Stat title="Eşya Adedi" value={itemSummary.total} />
              <Stat title="Kayıp Eşya" value={itemSummary.lost} danger={itemSummary.lost > 0} />
              <Stat title="Değerli Eşya" value={itemSummary.valuable} />
              <Stat title="Hastane Süreci" value={hospitalCases.length} />
            </div>

            <section className="p3ItemPanel">
              <div className="p2PanelHead">
                <h3>Eşya Listesi</h3>
                <span>Kıyafet, kişisel eşya, değerli eşya ve medikal eşya takibi.</span>
              </div>

              <div className="p3ItemForm">
                <div>
                  <label>Kategori</label>
                  <select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
                    <option>Kıyafet</option>
                    <option>Kişisel Eşya</option>
                    <option>Değerli Eşya</option>
                    <option>Medikal Eşya</option>
                    <option>Diğer</option>
                  </select>
                </div>
                <div>
                  <label>Eşya Adı</label>
                  <input value={itemForm.item_name} onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })} placeholder="Örn: Pantolon, saat, baston" />
                </div>
                <div>
                  <label>Adet</label>
                  <input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                </div>
                <div>
                  <label>Teslim Eden</label>
                  <input value={itemForm.delivered_by} onChange={(e) => setItemForm({ ...itemForm, delivered_by: e.target.value })} />
                </div>
                <div>
                  <label>Teslim Tarihi</label>
                  <input type="date" value={itemForm.delivered_at} onChange={(e) => setItemForm({ ...itemForm, delivered_at: e.target.value })} />
                </div>
                <div>
                  <label>Durum</label>
                  <select value={itemForm.status} onChange={(e) => setItemForm({ ...itemForm, status: e.target.value })}>
                    <option>Teslim Alındı</option>
                    <option>Kullanımda</option>
                    <option>Kayıp</option>
                    <option>Teslim Edildi</option>
                  </select>
                </div>
                <div className="p3Wide">
                  <label>Açıklama / Not</label>
                  <input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Renk, marka, beden veya açıklama" />
                </div>
                <button onClick={createItem}>Eşya Ekle</button>
              </div>

              <div className="p3ItemsGrid">
                {items.map((item) => (
                  <div className={`p3ItemCard ${itemTone(item.status)}`} key={item.id}>
                    <div className="p3ItemTop">
                      <span>{item.category}</span>
                      <b>{item.quantity || 1} adet</b>
                    </div>
                    <h4>{item.item_name}</h4>
                    <p>{item.description || item.note || '-'}</p>
                    <small>Teslim eden: {item.delivered_by || '-'} • {fmtDate(item.delivered_at)}</small>
                    <div className="p3ItemActions">
                      <select value={item.status || 'Teslim Alındı'} onChange={(e) => updateItemStatus(item, e.target.value)}>
                        <option>Teslim Alındı</option>
                        <option>Kullanımda</option>
                        <option>Kayıp</option>
                        <option>Teslim Edildi</option>
                      </select>
                      <button onClick={() => deleteItem(item)}>Sil</button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="p2Empty">Eşya kaydı yok.</div>}
              </div>
            </section>

            <div className="p2ContentGrid">
              <section className="p2Panel">
                <div className="p2PanelHead">
                  <h3>Aktif İlaçlar</h3>
                  <Link href={`/patients/${patientId}#medicine`}>Detay</Link>
                </div>
                <div className="p2MedicineList">
                  {activeMeds.slice(0, 6).map((m) => {
                    const c = calcMedicine(m);
                    return (
                      <div className="p2Medicine" key={m.id}>
                        <div><strong>{m.medicine_name}</strong><span>Günlük doz: {m.daily_dose || '-'}</span></div>
                        <b>{c.remaining} stok</b>
                      </div>
                    );
                  })}
                  {activeMeds.length === 0 && <div className="p2Empty">Aktif ilaç yok.</div>}
                </div>
              </section>
              <section className="p2Panel"><h3>Hatırlatıcılar</h3><List rows={reminders} titleField="title" subField="reminder_type" dateField="remind_at" empty="Hatırlatıcı yok." /></section>
              <section className="p2Panel"><h3>Hastane Süreçleri</h3><List rows={hospitalCases} titleField="hospital_name" subField="status" dateField="created_at" empty="Hastane süreci yok." /></section>
              <section className="p2Panel"><h3>Olay Geçmişi</h3><List rows={incidents} titleField="incident_type" subField="description" dateField="created_at" empty="Olay kaydı yok." /></section>
            </div>

            <div className="p2BottomGrid">
              <section className="p2Panel"><h3>Hasta Notları</h3><List rows={notes} titleField="title" subField="note" dateField="created_at" empty="Not yok." /></section>
              <section className="p2Panel">
                <div className="p2PanelHead"><h3>Zaman Tüneli</h3><button onClick={createTimelineEvent}>+ Ekle</button></div>
                <div className="p2Timeline">
                  {timeline.map((t) => (
                    <div className="p2TimelineItem" key={t.id}>
                      <span />
                      <div><b>{t.title}</b><p>{t.description || t.event_type}</p><small>{fmtDateTime(t.event_date)}</small></div>
                    </div>
                  ))}
                  {timeline.length === 0 && <div className="p2Empty">Zaman tüneli kaydı yok.</div>}
                </div>
              </section>
            </div>
          </>
        )}
      </Shell>

      <style jsx global>{`
        .p2Header{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-bottom:16px}.p2Header a{color:#2563eb;text-decoration:none;font-weight:900}.p2Header h2{margin:8px 0 0;color:#0f172a;font-size:30px;font-weight:900}.p2Header p{margin:6px 0 0;color:#64748b}.p2HeaderActions{display:flex;gap:10px}.p2HeaderActions a,.p2HeaderActions button{height:40px;border:none;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-weight:900;text-decoration:none;display:flex;align-items:center;padding:0 12px;cursor:pointer}
        .p2TopGrid{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;gap:16px;margin-bottom:16px}.p2PatientCard,.p2Panel,.p3ItemPanel{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px;box-shadow:0 8px 18px rgba(15,23,42,.04)}.p2PatientCard{text-align:center}.p2Avatar{width:86px;height:86px;border-radius:999px;background:#dbeafe;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;margin:0 auto 12px}.p2PatientCard h3{margin:0;color:#0f172a;font-size:22px}.p2Status{display:inline-block;background:#dcfce7;color:#166534;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:900;margin-top:8px}.p2InfoRows{text-align:left;margin-top:14px}.p2InfoRows p{margin:7px 0;color:#334155}.p2InfoRows b{color:#0f172a}
        .p2Panel h3,.p3ItemPanel h3{margin:0 0 12px;color:#0f172a;font-size:18px}.p2PanelHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.p2PanelHead h3{margin:0}.p2PanelHead a,.p2PanelHead button{border:none;background:#eff6ff;color:#1d4ed8;border-radius:10px;padding:7px 10px;font-size:13px;font-weight:900;text-decoration:none;cursor:pointer}.p2PanelHead span{color:#64748b;font-size:13px;font-weight:700}.p2RelativeBig{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px}.p2RelativeBig strong{display:block;color:#0f172a;font-size:17px}.p2RelativeBig span,.p2RelativeBig p{display:block;color:#64748b;margin:5px 0 0}.p2Health p{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #f1f5f9;padding:9px 0;margin:0}.p2Health b{color:#334155}.p2Health span{color:#0f172a;font-weight:900;text-align:right}
        .p2RiskRow{display:flex;align-items:center;justify-content:space-between;margin:10px 0}.p2RiskRow span{color:#334155;font-weight:800}.p2RiskRow b{border-radius:999px;padding:4px 9px;font-size:12px}.p2RiskRow.ok b{background:#dcfce7;color:#166534}.p2RiskRow.warn b{background:#fef3c7;color:#92400e}.p2RiskRow.danger b{background:#fee2e2;color:#991b1b}
        .p2Stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-bottom:16px}.p2Stat{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px}.p2Stat span{display:block;color:#64748b;font-size:13px;font-weight:900}.p2Stat strong{display:block;color:#0f172a;font-size:30px;margin-top:7px}.p2Stat.danger{background:#fef2f2;border-color:#fecaca}.p2Stat.danger strong{color:#dc2626}
        .p3ItemPanel{margin-bottom:16px}.p3ItemForm{display:grid;grid-template-columns:1fr 1.5fr .7fr 1fr 1fr 1fr 2fr auto;gap:10px;align-items:end;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:12px;margin-bottom:14px}.p3ItemForm label{display:block;color:#334155;font-size:12px;font-weight:900;margin-bottom:5px}.p3ItemForm input,.p3ItemForm select{width:100%;height:40px;border:1px solid #cbd5e1;border-radius:10px;padding:0 10px;background:white;color:#0f172a}.p3ItemForm button{height:40px;border:none;border-radius:10px;background:#16a34a;color:white;font-weight:900;padding:0 14px;cursor:pointer}.p3Wide{min-width:180px}
        .p3ItemsGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.p3ItemCard{border:1px solid #e5e7eb;border-radius:16px;padding:14px;background:#fff}.p3ItemCard.ok{background:#f0fdf4;border-color:#bbf7d0}.p3ItemCard.blue{background:#eff6ff;border-color:#bfdbfe}.p3ItemCard.danger{background:#fef2f2;border-color:#fecaca}.p3ItemCard.gray{background:#f8fafc;border-color:#e2e8f0}.p3ItemTop{display:flex;justify-content:space-between;gap:8px}.p3ItemTop span{color:#64748b;font-size:12px;font-weight:900}.p3ItemTop b{color:#0f172a}.p3ItemCard h4{margin:9px 0 6px;color:#0f172a;font-size:17px}.p3ItemCard p{margin:0;color:#475569}.p3ItemCard small{display:block;color:#64748b;margin-top:8px}.p3ItemActions{display:flex;gap:8px;margin-top:12px}.p3ItemActions select{flex:1;height:34px;border:1px solid #cbd5e1;border-radius:10px;background:white}.p3ItemActions button{height:34px;border:none;border-radius:10px;background:#fee2e2;color:#991b1b;font-weight:900;padding:0 10px;cursor:pointer}
        .p2ContentGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:16px}.p2BottomGrid{display:grid;grid-template-columns:1fr 2fr;gap:16px}.p2MedicineList{display:flex;flex-direction:column;gap:10px}.p2Medicine{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #f1f5f9;padding-top:10px}.p2Medicine:first-child{border-top:none;padding-top:0}.p2Medicine strong{display:block;color:#0f172a}.p2Medicine span{display:block;color:#64748b;font-size:13px;margin-top:3px}.p2Medicine b{color:#1d4ed8}
        .p2List{display:flex;flex-direction:column;gap:10px}.p2Row{border-top:1px solid #f1f5f9;padding-top:10px}.p2Row:first-child{border-top:none;padding-top:0}.p2Row strong{display:block;color:#0f172a}.p2Row span,.p2Row small{display:block;color:#64748b;font-size:13px;margin-top:3px}.p2Empty{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px;color:#64748b;font-weight:800}
        .p2Timeline{display:flex;flex-direction:column;gap:12px}.p2TimelineItem{display:grid;grid-template-columns:14px 1fr;gap:10px}.p2TimelineItem>span{width:12px;height:12px;border-radius:999px;background:#2563eb;margin-top:4px;box-shadow:0 0 0 4px #dbeafe}.p2TimelineItem b{display:block;color:#0f172a}.p2TimelineItem p{margin:4px 0;color:#475569}.p2TimelineItem small{color:#64748b}
        @media(max-width:1400px){.p3ItemForm{grid-template-columns:repeat(4,minmax(0,1fr))}.p3ItemsGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:1300px){.p2TopGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.p2ContentGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.p2Stats{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:800px){.p2Header,.p2HeaderActions{flex-direction:column;align-items:stretch}.p2TopGrid,.p2ContentGrid,.p2BottomGrid,.p3ItemsGrid,.p3ItemForm{grid-template-columns:1fr}.p2Stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `}</style>
    </>
  );
}

function Stat({ title, value, danger = false }: { title: string; value: number; danger?: boolean }) {
  return <div className={`p2Stat ${danger ? 'danger' : ''}`}><span>{title}</span><strong>{value}</strong></div>;
}

function RiskRow({ label, value }: { label: string; value: string }) {
  return <div className={`p2RiskRow ${riskTone(value)}`}><span>{label}</span><b>{value}</b></div>;
}

function List({ rows, titleField, subField, dateField, empty }: { rows: Row[]; titleField: string; subField: string; dateField: string; empty: string }) {
  if (!rows.length) return <div className="p2Empty">{empty}</div>;
  return (
    <div className="p2List">
      {rows.map((row) => (
        <div className="p2Row" key={row.id}>
          <strong>{row[titleField] || '-'}</strong>
          <span>{row[subField] || '-'}</span>
          <small>{fmtDateTime(row[dateField] || row.created_at)}</small>
        </div>
      ))}
    </div>
  );
}
