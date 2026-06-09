'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Row = Record<string, any>;

const tabs = [
  ['summary', 'Özet'],
  ['profile', 'Genel Bilgiler'],
  ['clinical', 'Klinik'],
  ['treatments', 'Tedaviler'],
  ['meds', 'İlaçlar'],
  ['care', 'Bakım'],
  ['nutrition', 'Beslenme'],
  ['wound', 'Pansuman'],
  ['docs', 'Evraklar'],
  ['belongings', 'Emanetler'],
  ['incidents', 'Olaylar'],
  ['transfers', 'Sevkler'],
  ['statusHistory', 'Durum Geçmişi'],
];

function fmt(value: any) {
  if (!value) return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString('tr-TR');
  }
  return String(value);
}

export default function Patient360Enterprise({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const [tab, setTab] = useState('summary');
  const [patient, setPatient] = useState<Row | null>(null);
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [patientId]);

  async function safeQuery(key: string, table: string, limit = 100) {
    try {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return [key, data || []] as [string, Row[]];
    } catch {
      return [key, []] as [string, Row[]];
    }
  }

  async function load() {
    setLoading(true);

    const { data: patientRow } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    setPatient(patientRow || null);

    const entries = await Promise.all([
      safeQuery('meds', 'medications'),
      safeQuery('treatments', 'treatment_records'),
      safeQuery('docs', 'documents'),
      safeQuery('vitals', 'vital_records'),
      safeQuery('incidents', 'incident_records'),
      safeQuery('transfers', 'hospital_transfers'),
      safeQuery('care', 'daily_care_records'),
      safeQuery('nutrition', 'nutrition_records'),
      safeQuery('wound', 'wound_care_records'),
      safeQuery('tasks', 'care_tasks'),
      safeQuery('belongings', 'belonging_records'),
      safeQuery('activities', 'activity_records'),
      safeQuery('physio', 'physio_records'),
      safeQuery('sleep', 'sleep_records'),
      safeQuery('behavior', 'behavior_records'),
      safeQuery('visitors', 'visitor_records'),
      safeQuery('risks', 'risk_score_records'),
      safeQuery('statusHistory', 'patient_status_history'),
      safeQuery('admissions', 'admission_records'),
      safeQuery('exits', 'exit_records'),
    ]);

    setData(Object.fromEntries(entries));
    setLoading(false);
  }

  async function openPatientDoc(path: string) {
    const { data, error } = await supabase.storage
      .from('patient-documents')
      .createSignedUrl(path, 60 * 10);

    if (error) return alert(error.message);
    window.open(data.signedUrl, '_blank');
  }

  async function openBelongingPhoto(path: string) {
    const { data, error } = await supabase.storage
      .from('belonging-photos')
      .createSignedUrl(path, 60 * 10);

    if (error) return alert(error.message);
    window.open(data.signedUrl, '_blank');
  }

  if (loading) {
    return (
      <Shell>
        <div className="notice">Hasta dosyası yükleniyor...</div>
      </Shell>
    );
  }

  if (!patient) {
    return (
      <Shell>
        <div className="panel">
          <h2>Hasta bulunamadı</h2>
          <p>Bu hasta kaydı silinmiş veya yetkin dışında olabilir.</p>
          <Link className="btn soft" href="/patients">Hasta listesine dön</Link>
        </div>
      </Shell>
    );
  }

  const requiredDocs = ['Kimlik Fotokopisi', 'Medula PDF', 'Epikriz'];
  const docCats = (data.docs || []).map((d) => d.category);
  const missingDocs = requiredDocs.filter((x) => !docCats.includes(x));

  const activeMeds = (data.meds || []).filter((m) => m.status !== 'stopped');
  const criticalMeds = activeMeds.filter((m) => Number(m.stock || 0) <= Number(m.min_stock || 0));
  const pendingTasks = (data.tasks || []).filter((t) => t.status === 'Aktif' || t.status === 'Bekliyor');
  const activeTreatments = (data.treatments || []).filter((t) => t.status !== 'Tamamlandı' && t.status !== 'Doktor Stop');
  const notReturnedBelongings = (data.belongings || []).filter((b) => b.status !== 'İade Edildi');

  return (
    <Shell>
      <div className="profileHeader">
        <div>
          <h1>{patient.full_name}</h1>
          <p>
            <b>TC:</b> {patient.tc_no || '-'} • <b>Durum:</b> {patient.status || 'Aktif'} • <b>Kat/Oda/Yatak:</b> {patient.floor_no || '-'} / {patient.room_no || '-'} / {patient.bed_no || '-'}
          </p>
          <p>
            <b>Yakın:</b> {patient.relative_name || '-'} • {patient.relative_phone || '-'} • <b>Doktor:</b> {patient.doctor_name || '-'}
          </p>
          <p>
            <b>Tanılar:</b> {patient.diagnoses || '-'} • <b>Alerji:</b> {patient.allergies || '-'}
          </p>
        </div>

        <div className="qrBox">
          <b>Hasta Dosyası 360 Enterprise</b><br />
          <span className={`pill ${missingDocs.length ? 'danger' : 'ok'}`}>
            {missingDocs.length ? `Eksik Evrak: ${missingDocs.length}` : 'Evrak Tam'}
          </span>
        </div>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Aktif İlaç</span><strong>{activeMeds.length}</strong></div>
        <div className="kpi"><span>Kritik İlaç</span><strong>{criticalMeds.length}</strong></div>
        <div className="kpi"><span>Aktif Tedavi</span><strong>{activeTreatments.length}</strong></div>
        <div className="kpi"><span>Vital</span><strong>{(data.vitals || []).length}</strong></div>
        <div className="kpi"><span>Olay</span><strong>{(data.incidents || []).length}</strong></div>
        <div className="kpi"><span>Sevk</span><strong>{(data.transfers || []).length}</strong></div>
        <div className="kpi"><span>Evrak</span><strong>{(data.docs || []).length}</strong></div>
        <div className="kpi"><span>Emanet</span><strong>{notReturnedBelongings.length}</strong></div>
        <div className="kpi"><span>Bekleyen Görev</span><strong>{pendingTasks.length}</strong></div>
      </div>

      <div className="panel">
        <div className="actions" style={{ marginTop: 0 }}>
          {tabs.map(([key, label]) => (
            <button key={key} className={tab === key ? 'primary' : 'soft'} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
          <button className="soft" onClick={load}>Yenile</button>
        </div>
      </div>

      {tab === 'summary' && (
        <div className="grid grid3">
          <div className="panel">
            <h2>Hasta Özeti</h2>
            <p><b>Durum:</b> {patient.status || 'Aktif'}</p>
            <p><b>Durum Notu:</b> {patient.status_note || '-'}</p>
            <p><b>Alarm No:</b> {patient.alarm_no || '-'}</p>
            <p><b>Yakın:</b> {patient.relative_name || '-'} / {patient.relative_phone || '-'}</p>
          </div>

          <div className="panel">
            <h2>Klinik Uyarılar</h2>
            {criticalMeds.length > 0 ? <div className="notice">Kritik ilaç stoğu var: <b>{criticalMeds.length}</b></div> : <span className="pill ok">Kritik ilaç yok</span>}
            {activeTreatments.length > 0 ? <div className="notice">Aktif tedavi: <b>{activeTreatments.length}</b></div> : <div className="notice">Aktif tedavi yok</div>}
            {pendingTasks.length > 0 ? <div className="notice">Bekleyen görev: <b>{pendingTasks.length}</b></div> : <div className="notice">Bekleyen görev yok</div>}
          </div>

          <div className="panel">
            <h2>Eksik Kontroller</h2>
            {missingDocs.length ? missingDocs.map((m) => <div className="notice" key={m}>{m} eksik</div>) : <span className="pill ok">Zorunlu evraklar tamam</span>}
            {notReturnedBelongings.length > 0 && <div className="notice">İade edilmemiş emanet: <b>{notReturnedBelongings.length}</b></div>}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div className="panel">
          <h2>Genel Bilgiler</h2>
          <div className="grid grid3">
            <Info label="Ad Soyad" value={patient.full_name} />
            <Info label="TC" value={patient.tc_no} />
            <Info label="Doğum Tarihi" value={patient.birth_date} />
            <Info label="Kat" value={patient.floor_no} />
            <Info label="Oda" value={patient.room_no} />
            <Info label="Yatak" value={patient.bed_no} />
            <Info label="Alarm No" value={patient.alarm_no} />
            <Info label="Yakın" value={patient.relative_name} />
            <Info label="Yakın Telefon" value={patient.relative_phone} />
            <Info label="Doktor" value={patient.doctor_name} />
            <Info label="Durum" value={patient.status || 'Aktif'} />
            <Info label="Durum Güncelleme" value={fmt(patient.status_updated_at)} />
          </div>
        </div>
      )}

      {tab === 'clinical' && (
        <>
          <Table title="Vital Kayıtları" rows={data.vitals || []} cols={['measured_at','systolic','diastolic','pulse','temperature','spo2','blood_glucose','note']} labels={['Zaman','Sys','Dia','Nabız','Ateş','SpO2','Şeker','Not']} dateCols={['measured_at']} />
          <Table title="Risk Skorları" rows={data.risks || []} cols={['score_date','fall_risk','pressure_risk','nutrition_risk','wandering_risk','status']} labels={['Tarih','Düşme','Bası','Beslenme','Kaybolma','Durum']} />
        </>
      )}

      {tab === 'treatments' && <Table title="Tedaviler" rows={data.treatments || []} cols={['treatment_date','treatment_time','treatment_type','treatment_name','route','dose','frequency','status','applied_by','doctor_name','note']} labels={['Tarih','Saat','Tür','Tedavi','Yol','Doz','Sıklık','Durum','Uygulayan','Doktor','Not']} />}

      {tab === 'meds' && <Table title="İlaçlar" rows={data.meds || []} cols={['drug_name','daily_use','stock','min_stock','status','note']} labels={['İlaç','Kullanım','Stok','Min','Durum','Not']} />}

      {tab === 'care' && (
        <>
          <Table title="Günlük Bakım" rows={data.care || []} cols={['care_at','care_type','status','performed_by','note']} labels={['Zaman','Bakım','Durum','Yapan','Not']} dateCols={['care_at']} />
          <Table title="Aktivite" rows={data.activities || []} cols={['activity_at','activity_type','participation','mood','status','social_note']} labels={['Zaman','Etkinlik','Katılım','Moral','Durum','Not']} dateCols={['activity_at']} />
          <Table title="Fizik Tedavi" rows={data.physio || []} cols={['exercise_at','exercise_type','duration_min','tolerance','performed_by','status','note']} labels={['Zaman','Egzersiz','Süre','Tolerans','Uygulayan','Durum','Not']} dateCols={['exercise_at']} />
          <Table title="Uyku" rows={data.sleep || []} cols={['sleep_date','sleep_quality','hours_slept','night_wake_count','restlessness','status','note']} labels={['Tarih','Kalite','Saat','Uyanma','Huzursuzluk','Durum','Not']} />
          <Table title="Davranış" rows={data.behavior || []} cols={['record_at','behavior_type','severity','trigger_note','intervention','status']} labels={['Zaman','Davranış','Şiddet','Tetikleyici','Müdahale','Durum']} dateCols={['record_at']} />
        </>
      )}

      {tab === 'nutrition' && <Table title="Beslenme / Sıvı" rows={data.nutrition || []} cols={['record_at','meal_type','intake_status','fluid_ml','diet_note','status']} labels={['Zaman','Öğün','Alım','Sıvı','Not','Durum']} dateCols={['record_at']} />}

      {tab === 'wound' && <Table title="Bası / Pansuman" rows={data.wound || []} cols={['record_at','wound_location','wound_stage','dressing_type','status','wound_note']} labels={['Zaman','Yer','Evre','Pansuman','Durum','Not']} dateCols={['record_at']} />}

      {tab === 'docs' && (
        <div className="panel">
          <div className="panelHead"><div><h2>Evraklar</h2><p>{(data.docs || []).length} kayıt</p></div></div>
          <div className="tableWrap">
            <table>
              <thead><tr><th>Tarih</th><th>Kategori</th><th>Başlık</th><th>Not</th><th>Dosya</th></tr></thead>
              <tbody>
                {(data.docs || []).map((d) => (
                  <tr key={d.id}>
                    <td>{fmt(d.created_at)}</td>
                    <td>{d.category || '-'}</td>
                    <td>{d.title || '-'}</td>
                    <td>{d.note || '-'}</td>
                    <td>{d.storage_path ? <button className="soft" onClick={() => openPatientDoc(d.storage_path)}>Aç</button> : '-'}</td>
                  </tr>
                ))}
                {(data.docs || []).length === 0 && <tr><td colSpan={5}>Kayıt yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'belongings' && (
        <div className="panel">
          <div className="panelHead"><div><h2>Emanet / Kıyafet</h2><p>{(data.belongings || []).length} kayıt</p></div></div>
          <div className="tableWrap">
            <table>
              <thead><tr><th>Grup</th><th>Tür</th><th>Ad</th><th>Marka/Model</th><th>Renk/Beden</th><th>Adet</th><th>Durum</th><th>Foto</th></tr></thead>
              <tbody>
                {(data.belongings || []).map((b) => (
                  <tr key={b.id}>
                    <td>{b.item_group || '-'}</td>
                    <td>{b.item_type || '-'}</td>
                    <td>{b.item_name || '-'}</td>
                    <td>{b.brand || '-'} / {b.model || '-'}</td>
                    <td>{b.color || '-'} / {b.size || '-'}</td>
                    <td>{b.quantity || 1}</td>
                    <td>{b.status || '-'}</td>
                    <td>{b.photo_path ? <button className="soft" onClick={() => openBelongingPhoto(b.photo_path)}>Aç</button> : '-'}</td>
                  </tr>
                ))}
                {(data.belongings || []).length === 0 && <tr><td colSpan={8}>Kayıt yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'incidents' && <Table title="Olay / Düşme" rows={data.incidents || []} cols={['incident_at','incident_type','location','severity','description','status']} labels={['Zaman','Tür','Yer','Şiddet','Açıklama','Durum']} dateCols={['incident_at']} />}

      {tab === 'transfers' && <Table title="Hastane Sevkleri" rows={data.transfers || []} cols={['transfer_at','hospital_name','reason','companion','transport_type','status','return_at']} labels={['Gidiş','Hastane','Neden','Refakatçi','Ulaşım','Durum','Dönüş']} dateCols={['transfer_at','return_at']} />}

      {tab === 'statusHistory' && (
        <>
          <Table title="Durum Geçmişi" rows={data.statusHistory || []} cols={['created_at','old_status','new_status','note']} labels={['Tarih','Eski Durum','Yeni Durum','Not']} dateCols={['created_at']} />
          <Table title="Kabul Kayıtları" rows={data.admissions || []} cols={['admission_date','admission_type','room_no','bed_no','brought_by','documents_checked','belongings_checked']} labels={['Tarih','Tür','Oda','Yatak','Getiren','Evrak','Emanet']} />
          <Table title="Ayrılış / Vefat Kayıtları" rows={data.exits || []} cols={['exit_date','exit_type','destination','taken_by','belongings_returned','documents_returned','archive_status']} labels={['Tarih','Tür','Yer','Teslim Alan','Emanet','Evrak','Arşiv']} />
        </>
      )}
    </Shell>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="notice">
      <b>{label}</b><br />
      {fmt(value)}
    </div>
  );
}

function Table({ rows, cols, labels, title, dateCols = [] }: { rows: Row[]; cols: string[]; labels: string[]; title: string; dateCols?: string[] }) {
  return (
    <div className="panel">
      <div className="panelHead">
        <div>
          <h2>{title}</h2>
          <p>{rows.length} kayıt</p>
        </div>
      </div>
      <div className="tableWrap">
        <table>
          <thead><tr>{labels.map((label) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {cols.map((col) => <td key={col}>{dateCols.includes(col) ? fmt(row[col]) : (row[col] || '-')}</td>)}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={cols.length}>Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
