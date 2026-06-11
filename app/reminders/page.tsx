'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { applyActiveFacilityFilter, getInsertFacilityId, useActiveFacility } from '@/lib/activeFacility';

type Row = Record<string, any>;

const allReminderTypes = [
  'Hasta Hastane Randevusu',
  'Hasta Görüşmesi',
  'Personel Görüşmesi',
];

const priorities = ['Normal', 'Önemli', 'Acil'];
const statuses = ['Bekliyor', 'Tamamlandı', 'İptal'];

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function fmt(value: any) {
  if (!value) return '-';
  return new Date(value).toLocaleString('tr-TR');
}

function isOverdue(row: Row) {
  return row.status === 'Bekliyor' && new Date(row.remind_at).getTime() < Date.now();
}

function isSoon(row: Row) {
  const t = new Date(row.remind_at).getTime();
  const diff = t - Date.now();
  return row.status === 'Bekliyor' && diff >= 0 && diff <= 24 * 60 * 60 * 1000;
}

export default function RemindersPage() {
  const ctx = useActiveFacility();

  const [facilities, setFacilities] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [reminders, setReminders] = useState<Row[]>([]);
  const [filter, setFilter] = useState('Bekliyor');

  const managerAccess = ctx.role === 'founder' || ctx.role === 'manager';
  const allowedTypes = managerAccess ? allReminderTypes : ['Hasta Hastane Randevusu'];

  const [form, setForm] = useState({
    facility_id: '',
    reminder_type: 'Hasta Hastane Randevusu',
    patient_id: '',
    person_name: '',
    title: '',
    remind_at: nowLocalInput(),
    priority: 'Normal',
    note: '',
  });

  useEffect(() => {
    if (!allowedTypes.includes(form.reminder_type)) {
      setForm((old) => ({ ...old, reminder_type: 'Hasta Hastane Randevusu' }));
    }
  }, [ctx.role]);

  useEffect(() => {
    load();
  }, [ctx.activeFacilityId, ctx.role, ctx.userFacilityId]);

  async function load() {
    const { data: facilityRows } = await supabase
      .from('facilities')
      .select('*')
      .order('name');

    setFacilities(facilityRows || []);

    let patientQuery = supabase
      .from('patients')
      .select('*')
      .order('full_name');

    patientQuery = applyActiveFacilityFilter(patientQuery, ctx);
    const { data: patientRows } = await patientQuery;
    setPatients(patientRows || []);

    let reminderQuery = supabase
      .from('reminder_records')
      .select('*')
      .order('remind_at', { ascending: true })
      .limit(500);

    reminderQuery = applyActiveFacilityFilter(reminderQuery, ctx);

    if (!managerAccess) {
      reminderQuery = reminderQuery.eq('reminder_type', 'Hasta Hastane Randevusu');
    }

    const { data: reminderRows } = await reminderQuery;
    setReminders(reminderRows || []);

    setForm((old) => ({
      ...old,
      facility_id: old.facility_id || getInsertFacilityId(ctx, facilityRows?.[0]?.id),
      patient_id: old.patient_id || patientRows?.[0]?.id || '',
    }));
  }

  function selectedPatient() {
    return patients.find((p) => p.id === form.patient_id);
  }

  async function save() {
    const facilityId = getInsertFacilityId(ctx, form.facility_id);

    if (!facilityId) return alert('Kurum seç.');
    if (!allowedTypes.includes(form.reminder_type)) return alert('Bu hatırlatıcı türü için yetkin yok.');
    if (!form.title) return alert('Başlık yaz.');
    if (!form.remind_at) return alert('Hatırlatma tarihi/saatini seç.');

    const patientRequired = form.reminder_type === 'Hasta Hastane Randevusu' || form.reminder_type === 'Hasta Görüşmesi';
    const patient = selectedPatient();

    if (patientRequired && !patient) return alert('Hasta seç.');
    if (form.reminder_type === 'Personel Görüşmesi' && !form.person_name) return alert('Personel adı yaz.');

    const { error } = await supabase.from('reminder_records').insert({
      facility_id: patient?.facility_id || facilityId,
      reminder_type: form.reminder_type,
      patient_id: patient?.id || null,
      patient_name: patient?.full_name || null,
      person_name: form.reminder_type === 'Personel Görüşmesi' ? form.person_name : null,
      title: form.title,
      remind_at: new Date(form.remind_at).toISOString(),
      priority: form.priority,
      status: 'Bekliyor',
      note: form.note || null,
    });

    if (error) return alert(error.message);

    setForm((old) => ({
      ...old,
      person_name: '',
      title: '',
      remind_at: nowLocalInput(),
      priority: 'Normal',
      note: '',
    }));

    await load();
  }

  async function updateStatus(row: Row, status: string) {
    if (!managerAccess && row.reminder_type !== 'Hasta Hastane Randevusu') {
      return alert('Bu hatırlatıcı türü için yetkin yok.');
    }

    const { error } = await supabase
      .from('reminder_records')
      .update({
        status,
        completed_at: status === 'Tamamlandı' ? new Date().toISOString() : null,
      })
      .eq('id', row.id);

    if (error) return alert(error.message);
    await load();
  }

  async function remove(row: Row) {
    if (!managerAccess && row.reminder_type !== 'Hasta Hastane Randevusu') {
      return alert('Bu hatırlatıcı türü için yetkin yok.');
    }

    if (!confirm('Bu hatırlatıcı silinsin mi?')) return;

    const { error } = await supabase
      .from('reminder_records')
      .delete()
      .eq('id', row.id);

    if (error) return alert(error.message);
    await load();
  }

  const filtered = reminders.filter((row) => {
    if (filter === 'Tümü') return true;
    if (filter === 'Geciken') return isOverdue(row);
    if (filter === 'Yaklaşan 24 Saat') return isSoon(row);
    return row.status === filter;
  });

  const pending = reminders.filter((r) => r.status === 'Bekliyor');
  const overdue = reminders.filter(isOverdue);
  const soon = reminders.filter(isSoon);
  const completed = reminders.filter((r) => r.status === 'Tamamlandı');

  return (
    <>
      <Shell>
        <div className="remHero">
          <div>
            <h2>Hatırlatıcı Merkezi</h2>
            <p>
              Hemşireler hasta hastane randevularını görür. Hasta görüşmesi ve personel görüşmesi sadece müdür/kurucu içindir.
            </p>
          </div>
        </div>

        <div className="remStats">
          <div><span>Bekleyen</span><strong>{pending.length}</strong></div>
          <div><span>Geciken</span><strong>{overdue.length}</strong></div>
          <div><span>24 Saat</span><strong>{soon.length}</strong></div>
          <div><span>Tamamlanan</span><strong>{completed.length}</strong></div>
        </div>

        <div className="remPanel">
          <h3>Yeni Hatırlatıcı</h3>

          <div className="remGrid4">
            <div>
              <label>Kurum</label>
              <select
                value={form.facility_id}
                onChange={(e) => setForm({ ...form, facility_id: e.target.value })}
                disabled={ctx.role !== 'founder' || ctx.activeFacilityId !== 'general'}
              >
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>{facility.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Hatırlatıcı Türü</label>
              <select value={form.reminder_type} onChange={(e) => setForm({ ...form, reminder_type: e.target.value })}>
                {allowedTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>

            {(form.reminder_type === 'Hasta Hastane Randevusu' || form.reminder_type === 'Hasta Görüşmesi') && (
              <div>
                <label>Hasta</label>
                <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            {form.reminder_type === 'Personel Görüşmesi' && (
              <div>
                <label>Personel Adı</label>
                <input value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} />
              </div>
            )}

            <div>
              <label>Tarih / Saat</label>
              <input type="datetime-local" value={form.remind_at} onChange={(e) => setForm({ ...form, remind_at: e.target.value })} />
            </div>
          </div>

          <div className="remGrid4">
            <div>
              <label>Başlık</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Örn: Kardiyoloji randevusu" />
            </div>

            <div>
              <label>Öncelik</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {priorities.map((priority) => <option key={priority}>{priority}</option>)}
              </select>
            </div>

            <div className="remWide">
              <label>Not</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>

          <button className="remPrimary" onClick={save}>Hatırlatıcı Kaydet</button>
        </div>

        <div className="remPanel">
          <div className="remHead">
            <h3>Hatırlatıcı Listesi</h3>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>Bekliyor</option>
              <option>Geciken</option>
              <option>Yaklaşan 24 Saat</option>
              <option>Tamamlandı</option>
              <option>İptal</option>
              <option>Tümü</option>
            </select>
          </div>

          <div className="remTableWrap">
            <table className="remTable">
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Tarih/Saat</th>
                  <th>Tür</th>
                  <th>Kişi / Hasta</th>
                  <th>Başlık</th>
                  <th>Öncelik</th>
                  <th>Not</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className={isOverdue(row) ? 'remOverdue' : isSoon(row) ? 'remSoon' : ''}>
                    <td>
                      <span className={`remBadge ${row.status === 'Tamamlandı' ? 'ok' : row.status === 'İptal' ? 'danger' : isOverdue(row) ? 'danger' : 'warn'}`}>
                        {isOverdue(row) ? 'Gecikti' : row.status}
                      </span>
                    </td>
                    <td>{fmt(row.remind_at)}</td>
                    <td>{row.reminder_type}</td>
                    <td>{row.patient_name || row.person_name || '-'}</td>
                    <td><b>{row.title}</b></td>
                    <td>{row.priority}</td>
                    <td>{row.note || '-'}</td>
                    <td>
                      <div className="remActions">
                        <select value={row.status} onChange={(e) => updateStatus(row, e.target.value)}>
                          {statuses.map((status) => <option key={status}>{status}</option>)}
                        </select>
                        <button onClick={() => remove(row)}>Sil</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr><td colSpan={8}>Kayıt yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Shell>

      <style jsx global>{`
        .remHero{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-bottom:16px}
        .remHero h2{margin:0;color:#0f172a;font-size:28px;font-weight:900}
        .remHero p{margin:6px 0 0;color:#64748b}
        .remStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
        .remStats div{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px}
        .remStats span{display:block;color:#64748b;font-size:13px;font-weight:800}
        .remStats strong{display:block;color:#0f172a;font-size:30px;margin-top:8px}
        .remPanel{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px;margin-bottom:16px}
        .remPanel h3{margin:0 0 14px;color:#0f172a;font-size:20px}
        .remGrid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:12px}
        .remWide{grid-column:span 2}
        .remPanel label{display:block;color:#475569;font-size:13px;font-weight:800;margin-bottom:6px}
        .remPanel input,.remPanel select{width:100%;height:42px;border:1px solid #cbd5e1;border-radius:12px;padding:0 10px;background:white;color:#0f172a}
        .remPrimary{height:44px;border:none;border-radius:12px;background:#2563eb;color:white;font-weight:900;padding:0 18px;cursor:pointer}
        .remHead{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
        .remHead h3{margin:0}
        .remHead select{max-width:220px}
        .remTableWrap{overflow:auto}
        .remTable{width:100%;border-collapse:collapse}
        .remTable th,.remTable td{border-bottom:1px solid #e5e7eb;text-align:left;padding:10px;font-size:14px;vertical-align:top}
        .remTable th{color:#475569;font-size:12px;text-transform:uppercase;background:#f8fafc}
        .remBadge{display:inline-block;border-radius:999px;padding:4px 9px;font-weight:900;font-size:12px;background:#fef3c7;color:#92400e}
        .remBadge.ok{background:#dcfce7;color:#166534}
        .remBadge.warn{background:#fef3c7;color:#92400e}
        .remBadge.danger{background:#fee2e2;color:#991b1b}
        .remOverdue{background:#fff7f7}
        .remSoon{background:#fffbeb}
        .remActions{display:flex;gap:8px}
        .remActions select{height:34px}
        .remActions button{height:34px;border:none;border-radius:10px;background:#fee2e2;color:#991b1b;font-weight:800;padding:0 10px;cursor:pointer}
        @media(max-width:1100px){.remGrid4{grid-template-columns:repeat(2,minmax(0,1fr))}.remStats{grid-template-columns:repeat(2,minmax(0,1fr))}.remWide{grid-column:span 1}}
        @media(max-width:700px){.remGrid4,.remStats{grid-template-columns:1fr}.remHead{flex-direction:column;align-items:stretch}.remHead select{max-width:none}}
      `}</style>
    </>
  );
}
