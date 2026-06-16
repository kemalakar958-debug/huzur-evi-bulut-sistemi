'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';
import { applyActiveFacilityFilter, useActiveFacility } from '@/lib/activeFacility';

type Row = Record<string, any>;

function ageFromBirthDate(value: string | null) {
  if (!value) return '-';
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return '-';

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;

  return String(age);
}

function fmtDate(value: any) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('tr-TR');
  } catch {
    return '-';
  }
}

function statusClass(status: string) {
  if (status === 'Aktif') return 'ok';
  if (status === 'Hastanede') return 'purple';
  if (status === 'İzinli') return 'blue';
  if (status === 'Vefat') return 'gray';
  if (status === 'Ayrıldı') return 'gray';
  return 'gray';
}

function patientInitials(name: string) {
  const parts = (name || '?').split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function downloadCsv(filename: string, rows: Row[]) {
  const headers = ['Ad Soyad', 'TC', 'Doğum Tarihi', 'Yaş', 'Kat', 'Oda', 'Yatak', 'Kurum', 'Durum', 'Yakın', 'Telefon', 'Doktor'];
  const body = rows.map((p) => [
    p.full_name || '',
    p.tc_no || '',
    fmtDate(p.birth_date),
    ageFromBirthDate(p.birth_date),
    p.floor_no || '',
    p.room_no || '',
    p.bed_no || '',
    p.facility_name || '',
    p.status || 'Aktif',
    p.relative_name || '',
    p.relative_phone || '',
    p.doctor_name || '',
  ]);

  const csv = [headers, ...body]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export default function PatientsPage() {
  const ctx = useActiveFacility();

  const [patients, setPatients] = useState<Row[]>([]);
  const [facilities, setFacilities] = useState<Row[]>([]);
  const [reminders, setReminders] = useState<Row[]>([]);
  const [medPlans, setMedPlans] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('Tümü');
  const [floorFilter, setFloorFilter] = useState('Tümü');
  const [roomFilter, setRoomFilter] = useState('Tümü');
  const [statusFilter, setStatusFilter] = useState('Tümü');
  const [quickFilter, setQuickFilter] = useState('');

  useEffect(() => {
    load();
  }, [ctx.activeFacilityId, ctx.role, ctx.userFacilityId]);

  async function load() {
    setLoading(true);

    const { data: facilityRows } = await supabase
      .from('facilities')
      .select('id, name')
      .order('name');

    setFacilities(facilityRows || []);

    let patientQuery = supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    patientQuery = applyActiveFacilityFilter(patientQuery, ctx);

    const { data: patientRows } = await patientQuery;

    const normalizedPatients = (patientRows || []).map((p) => ({
      ...p,
      facility_name: (facilityRows || []).find((f) => f.id === p.facility_id)?.name || '-',
    }));

    setPatients(normalizedPatients);

    try {
      let reminderQuery = supabase
        .from('reminder_records')
        .select('*')
        .gte('remind_at', new Date().toISOString())
        .lte('remind_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('remind_at', { ascending: true })
        .limit(200);

      reminderQuery = applyActiveFacilityFilter(reminderQuery, ctx);

      const { data: reminderRows } = await reminderQuery;
      setReminders(reminderRows || []);
    } catch {
      setReminders([]);
    }

    try {
      let medsQuery = supabase
        .from('patient_medicine_plans')
        .select('*')
        .eq('status', 'Aktif')
        .limit(1000);

      medsQuery = applyActiveFacilityFilter(medsQuery, ctx);

      const { data: medRows } = await medsQuery;
      setMedPlans(medRows || []);
    } catch {
      setMedPlans([]);
    }

    setLoading(false);
  }

  function patientHasReminder(patientId: string) {
    return reminders.some((r) => r.patient_id === patientId);
  }

  function patientHasCriticalMedicine(patientId: string) {
    return medPlans.some((m) => {
      if (m.patient_id !== patientId) return false;

      const startDate = m.start_date ? new Date(`${m.start_date}T00:00:00`) : new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const daysPassed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const remaining = Number(m.initial_stock || 0) - Number(m.daily_dose || 0) * daysPassed;
      const remainingDays = Number(m.daily_dose || 0) > 0 ? Math.floor(remaining / Number(m.daily_dose || 0)) : 999;

      return remainingDays <= 30;
    });
  }

  const floors = useMemo(() => {
    return Array.from(new Set(patients.map((p) => p.floor_no).filter(Boolean))).sort();
  }, [patients]);

  const rooms = useMemo(() => {
    return Array.from(new Set(patients.map((p) => p.room_no).filter(Boolean))).sort();
  }, [patients]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();

    return patients.filter((p) => {
      const haystack = [
        p.full_name,
        p.tc_no,
        p.room_no,
        p.bed_no,
        p.relative_name,
        p.relative_phone,
        p.doctor_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (q && !haystack.includes(q)) return false;
      if (facilityFilter !== 'Tümü' && p.facility_id !== facilityFilter) return false;
      if (floorFilter !== 'Tümü' && p.floor_no !== floorFilter) return false;
      if (roomFilter !== 'Tümü' && p.room_no !== roomFilter) return false;
      if (statusFilter !== 'Tümü' && (p.status || 'Aktif') !== statusFilter) return false;

      if (quickFilter === 'Kritik İlaç' && !patientHasCriticalMedicine(p.id)) return false;
      if (quickFilter === 'Randevusu Olan' && !patientHasReminder(p.id)) return false;
      if (quickFilter === 'Hastanede' && p.status !== 'Hastanede') return false;
      if (quickFilter === 'Vefat' && p.status !== 'Vefat') return false;

      return true;
    });
  }, [patients, search, facilityFilter, floorFilter, roomFilter, statusFilter, quickFilter, reminders, medPlans]);

  const stats = {
    total: patients.length,
    active: patients.filter((p) => (p.status || 'Aktif') === 'Aktif').length,
    hospital: patients.filter((p) => p.status === 'Hastanede').length,
    critical: patients.filter((p) => patientHasCriticalMedicine(p.id)).length,
    deceased: patients.filter((p) => p.status === 'Vefat').length,
    reminders: patients.filter((p) => patientHasReminder(p.id)).length,
  };

  const latestPatients = patients.slice(0, 4);
  const nextReminders = reminders.slice(0, 4);

  function clearFilters() {
    setSearch('');
    setFacilityFilter('Tümü');
    setFloorFilter('Tümü');
    setRoomFilter('Tümü');
    setStatusFilter('Tümü');
    setQuickFilter('');
  }

  return (
    <>
      <Shell>
        <div className="plHeader">
          <div>
            <h2>Hasta Listesi</h2>
            <p>Tüm hastalarınızı görüntüleyin, arayın ve filtreleyin.</p>
          </div>

          <div className="plTopActions">
            <Link href="/reminders" className="plTopBtn">🔔 Bildirimler <b>{reminders.length}</b></Link>
            <Link href="/reminders" className="plTopBtn">📅 Randevular <b>{stats.reminders}</b></Link>
            <button className="plTopBtn warning" type="button">⚠️ Kritik İlaç <b>{stats.critical}</b></button>
          </div>
        </div>

        <div className="plLayout">
          <main className="plMain">
            <section className="plFilters">
              <div className="plFilterGrid">
                <div>
                  <label>Hasta Ara</label>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad, soyad, TC veya oda no..." />
                </div>

                <div>
                  <label>Kurum</label>
                  <select value={facilityFilter} onChange={(e) => setFacilityFilter(e.target.value)} disabled={ctx.role !== 'founder' || ctx.activeFacilityId !== 'general'}>
                    <option>Tümü</option>
                    {facilities.map((f) => <option value={f.id} key={f.id}>{f.name}</option>)}
                  </select>
                </div>

                <div>
                  <label>Kat / Bölüm</label>
                  <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
                    <option>Tümü</option>
                    {floors.map((floor) => <option key={floor}>{floor}</option>)}
                  </select>
                </div>

                <div>
                  <label>Oda</label>
                  <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
                    <option>Tümü</option>
                    {rooms.map((room) => <option key={room}>{room}</option>)}
                  </select>
                </div>

                <div>
                  <label>Durum</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option>Tümü</option>
                    <option>Aktif</option>
                    <option>Hastanede</option>
                    <option>İzinli</option>
                    <option>Vefat</option>
                    <option>Ayrıldı</option>
                  </select>
                </div>
              </div>

              <div className="plQuickRow">
                <button className={quickFilter === '' ? 'active' : ''} onClick={() => setQuickFilter('')}>Tümü</button>
                <button className={quickFilter === 'Kritik İlaç' ? 'active danger' : 'danger'} onClick={() => setQuickFilter('Kritik İlaç')}>Kritik İlaç ({stats.critical})</button>
                <button className={quickFilter === 'Randevusu Olan' ? 'active blue' : 'blue'} onClick={() => setQuickFilter('Randevusu Olan')}>Randevusu Olan ({stats.reminders})</button>
                <button className={quickFilter === 'Hastanede' ? 'active purple' : 'purple'} onClick={() => setQuickFilter('Hastanede')}>Hastanede Yatan ({stats.hospital})</button>
                <button className={quickFilter === 'Vefat' ? 'active gray' : 'gray'} onClick={() => setQuickFilter('Vefat')}>Vefat Eden ({stats.deceased})</button>

                <div className="plQuickSpacer" />

                <button onClick={clearFilters}>Filtreleri Temizle</button>
                <Link className="plNewBtn" href="/patients/new">+ Yeni Hasta Ekle</Link>
                <button onClick={() => downloadCsv('hasta-listesi.csv', filteredPatients)}>Dışa Aktar</button>
              </div>
            </section>

            <section className="plTableCard">
              <div className="plTableWrap">
                <table className="plTable">
                  <thead>
                    <tr>
                      <th>Hasta</th>
                      <th>TC Kimlik No</th>
                      <th>Doğum Tarihi</th>
                      <th>Oda / Yatak</th>
                      <th>Kurum</th>
                      <th>Durum</th>
                      <th>Son İşlem</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="plPatientCell">
                            <div className="plAvatar">{patientInitials(p.full_name || '?')}</div>
                            <div>
                              <strong>{p.full_name}</strong>
                              <span>{p.gender || ''}</span>
                            </div>
                          </div>
                        </td>
                        <td>{p.tc_no || '-'}</td>
                        <td>{fmtDate(p.birth_date)}<br /><small>({ageFromBirthDate(p.birth_date)})</small></td>
                        <td>
                          <b>{p.room_no || '-'} / {p.bed_no || '-'}</b>
                          <br />
                          <small>{p.floor_no ? `${p.floor_no}. Kat` : '-'}</small>
                        </td>
                        <td>{p.facility_name || '-'}</td>
                        <td>
                          <span className={`plStatus ${statusClass(p.status || 'Aktif')}`}>{p.status || 'Aktif'}</span>
                          {patientHasCriticalMedicine(p.id) && <span className="plTinyDanger">Kritik İlaç</span>}
                        </td>
                        <td>
                          {patientHasReminder(p.id) ? 'Yaklaşan randevu' : 'Kayıt güncel'}
                          <br />
                          <small>{fmtDate(p.created_at)}</small>
                        </td>
                        <td>
                          <div className="plActions">
                            <Link href={`/patients/${p.id}`}>👁️</Link>
                            <Link href={`/patients/${p.id}`}>📄</Link>
                            <button onClick={() => alert('Düzenleme ekranını sonraki pakette bağlayacağız.')}>⋮</button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!loading && filteredPatients.length === 0 && (
                      <tr>
                        <td colSpan={8}>
                          <div className="plEmpty">Filtreye uygun hasta bulunamadı.</div>
                        </td>
                      </tr>
                    )}

                    {loading && (
                      <tr>
                        <td colSpan={8}>
                          <div className="plEmpty">Yükleniyor...</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="plTableFooter">
                <span>Toplam {filteredPatients.length} hasta gösteriliyor.</span>
                <div>
                  <button>‹</button>
                  <button className="active">1</button>
                  <button>2</button>
                  <button>3</button>
                  <button>›</button>
                </div>
              </div>
            </section>
          </main>

          <aside className="plRight">
            <section className="plSideCard">
              <h3>Hasta Özeti</h3>
              <SummaryRow label="Toplam Hasta" value={stats.total} tone="green" />
              <SummaryRow label="Aktif Hasta" value={stats.active} tone="green" />
              <SummaryRow label="Hastanede Yatan" value={stats.hospital} tone="purple" />
              <SummaryRow label="Kritik İlaç Kullanan" value={stats.critical} tone="red" />
              <SummaryRow label="Vefat Eden" value={stats.deceased} tone="gray" />
            </section>

            <section className="plSideCard">
              <div className="plSideHead">
                <h3>Yaklaşan Randevular</h3>
                <Link href="/reminders">Tümü</Link>
              </div>

              {nextReminders.map((r) => (
                <div className="plReminder" key={r.id}>
                  <div>
                    <b>{new Date(r.remind_at).getDate()}</b>
                    <span>{new Date(r.remind_at).toLocaleDateString('tr-TR', { month: 'short' })}</span>
                  </div>
                  <main>
                    <strong>{r.patient_name || r.person_name || '-'}</strong>
                    <small>{r.title || r.reminder_type}</small>
                  </main>
                  <time>{new Date(r.remind_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time>
                </div>
              ))}

              {nextReminders.length === 0 && <div className="plSmallEmpty">Yaklaşan randevu yok.</div>}
            </section>

            <section className="plSideCard">
              <div className="plSideHead">
                <h3>Son Eklenen Hastalar</h3>
                <Link href="/patients">Tümü</Link>
              </div>

              {latestPatients.map((p) => (
                <Link className="plLatest" href={`/patients/${p.id}`} key={p.id}>
                  <div className="plMiniAvatar">{patientInitials(p.full_name || '?')}</div>
                  <strong>{p.full_name}</strong>
                  <span>{fmtDate(p.created_at)}</span>
                </Link>
              ))}
            </section>
          </aside>
        </div>
      </Shell>

      <style jsx global>{`
        .plHeader{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-bottom:16px}
        .plHeader h2{margin:0;color:#0f172a;font-size:28px;font-weight:900}.plHeader p{margin:6px 0 0;color:#64748b}.plTopActions{display:flex;gap:10px;align-items:center}.plTopBtn{height:42px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;color:#0f172a;text-decoration:none;display:flex;align-items:center;gap:8px;padding:0 12px;font-weight:800}.plTopBtn b{background:#ef4444;color:white;border-radius:999px;padding:2px 7px;font-size:12px}.plTopBtn.warning b{background:#f97316}
        .plLayout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px}.plFilters{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-bottom:16px}.plFilterGrid{display:grid;grid-template-columns:1.6fr repeat(4,1fr);gap:12px}.plFilterGrid label{display:block;color:#334155;font-size:13px;font-weight:900;margin-bottom:7px}.plFilterGrid input,.plFilterGrid select{width:100%;height:42px;border:1px solid #cbd5e1;border-radius:12px;padding:0 12px;background:#fff;color:#0f172a}
        .plQuickRow{display:flex;align-items:center;gap:10px;margin-top:16px;flex-wrap:wrap}.plQuickRow button,.plNewBtn{height:38px;border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:0 12px;font-weight:900;color:#334155;text-decoration:none;display:flex;align-items:center;cursor:pointer}.plQuickRow button.active{background:#0f172a;color:#fff}.plQuickRow .danger{background:#fef2f2;color:#b91c1c}.plQuickRow .blue{background:#eff6ff;color:#1d4ed8}.plQuickRow .purple{background:#f5f3ff;color:#6d28d9}.plQuickRow .gray{background:#f1f5f9;color:#475569}.plQuickSpacer{flex:1}.plNewBtn{background:#16a34a;color:#fff;border-color:#16a34a}
        .plTableCard{background:#fff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden}.plTableWrap{overflow:auto}.plTable{width:100%;border-collapse:collapse}.plTable th,.plTable td{border-bottom:1px solid #e5e7eb;text-align:left;padding:14px 12px;vertical-align:middle;font-size:14px}.plTable th{background:#f8fafc;color:#475569;font-size:12px;text-transform:uppercase;white-space:nowrap}.plPatientCell{display:flex;align-items:center;gap:12px}.plPatientCell strong{display:block;color:#0f172a}.plPatientCell span{display:inline-block;background:#dbeafe;color:#1d4ed8;border-radius:8px;padding:3px 7px;font-size:12px;font-weight:900;margin-top:4px}
        .plAvatar,.plMiniAvatar{width:42px;height:42px;border-radius:999px;background:#e2e8f0;color:#334155;display:flex;align-items:center;justify-content:center;font-weight:900}.plMiniAvatar{width:34px;height:34px;font-size:13px}.plStatus{display:inline-block;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:900}.plStatus.ok{background:#dcfce7;color:#166534}.plStatus.purple{background:#ede9fe;color:#6d28d9}.plStatus.blue{background:#dbeafe;color:#1d4ed8}.plStatus.gray{background:#f1f5f9;color:#475569}.plTinyDanger{display:block;width:max-content;background:#fee2e2;color:#991b1b;border-radius:999px;padding:3px 7px;font-size:11px;font-weight:900;margin-top:5px}.plActions{display:flex;gap:6px}.plActions a,.plActions button{width:32px;height:32px;border:1px solid #e5e7eb;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer}
        .plTableFooter{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;color:#64748b}.plTableFooter button{width:34px;height:34px;border:1px solid #e5e7eb;background:#fff;border-radius:10px;margin-left:6px}.plTableFooter button.active{background:#2563eb;color:#fff}.plEmpty,.plSmallEmpty{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;color:#64748b;font-weight:800}.plSmallEmpty{font-size:13px}
        .plRight{display:flex;flex-direction:column;gap:16px}.plSideCard{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:18px}.plSideCard h3{margin:0 0 14px;color:#0f172a}.plSummaryRow{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding:10px 0}.plSummaryRow:last-child{border-bottom:none}.plSummaryRow span{color:#334155;font-weight:800}.plSummaryRow b{font-size:18px}.plSummaryRow.green b{color:#16a34a}.plSummaryRow.purple b{color:#6d28d9}.plSummaryRow.red b{color:#dc2626}.plSummaryRow.gray b{color:#64748b}
        .plSideHead{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.plSideHead h3{margin:0}.plSideHead a{color:#2563eb;font-weight:900;text-decoration:none;font-size:13px}.plReminder{display:grid;grid-template-columns:48px 1fr auto;gap:10px;align-items:center;border-top:1px solid #f1f5f9;padding:12px 0}.plReminder:first-of-type{border-top:none}.plReminder div{background:#f8fafc;border-radius:12px;padding:7px;text-align:center}.plReminder div b{display:block;color:#0f172a}.plReminder div span{font-size:11px;color:#ef4444;font-weight:900;text-transform:uppercase}.plReminder main strong{display:block;color:#0f172a}.plReminder main small{display:block;color:#64748b;margin-top:3px}.plReminder time{color:#334155;font-weight:800}
        .plLatest{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;text-decoration:none;color:inherit;border-top:1px solid #f1f5f9;padding:11px 0}.plLatest:first-of-type{border-top:none}.plLatest strong{color:#0f172a}.plLatest span{color:#64748b;font-size:12px}
        @media(max-width:1200px){.plLayout{grid-template-columns:1fr}.plFilterGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.plHeader{flex-direction:column;align-items:stretch}.plTopActions{flex-direction:column;align-items:stretch}.plFilterGrid{grid-template-columns:1fr}.plQuickRow{align-items:stretch}.plQuickRow button,.plNewBtn{width:100%;justify-content:center}.plQuickSpacer{display:none}.plTableFooter{flex-direction:column;gap:12px;align-items:flex-start}}
      `}</style>
    </>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={`plSummaryRow ${tone}`}><span>{label}</span><b>{value}</b></div>;
}
