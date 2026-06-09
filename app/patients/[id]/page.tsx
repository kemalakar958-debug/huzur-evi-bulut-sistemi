'use client';

import { useEffect, useState, use } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = any;
type Row = any;

const tabs = [
  ['summary', 'Özet'],
  ['meds', 'İlaçlar'],
  ['treatments', 'Tedaviler'],
  ['docs', 'Evraklar'],
  ['vitals', 'Vital'],
  ['incidents', 'Olaylar'],
  ['transfers', 'Sevk'],
  ['care', 'Bakım'],
  ['nutrition', 'Beslenme'],
  ['wound', 'Pansuman'],
  ['tasks', 'Görevler'],
];

export default function Patient360({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const [tab, setTab] = useState('summary');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [data, setData] = useState<Record<string, Row[]>>({});

  useEffect(() => {
    load();
  }, [patientId]);

  async function q(key: string, table: string) {
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(100);

    return [key, data || []] as [string, Row[]];
  }

  async function load() {
    const { data: patientRow } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    setPatient(patientRow);

    const entries = await Promise.all([
      q('meds', 'medications'),
      q('treatments', 'treatment_records'),
      q('docs', 'documents'),
      q('vitals', 'vital_records'),
      q('incidents', 'incident_records'),
      q('transfers', 'hospital_transfers'),
      q('care', 'daily_care_records'),
      q('nutrition', 'nutrition_records'),
      q('wound', 'wound_care_records'),
      q('tasks', 'care_tasks'),
    ].map((promise) => promise.catch(() => ['x', []] as [string, Row[]])));

    setData(Object.fromEntries(entries));
  }

  async function openDoc(path: string) {
    const { data, error } = await supabase.storage
      .from('patient-documents')
      .createSignedUrl(path, 60 * 10);

    if (error) return alert(error.message);
    window.open(data.signedUrl, '_blank');
  }

  if (!patient) {
    return (
      <Shell>
        <div className="notice">Hasta dosyası yükleniyor...</div>
      </Shell>
    );
  }

  const required = ['Kimlik Fotokopisi', 'Medula PDF', 'Epikriz'];
  const cats = (data.docs || []).map((d: any) => d.category);
  const missing = required.filter((x) => !cats.includes(x));

  return (
    <Shell>
      <div className="profileHeader">
        <div>
          <h1>{patient.full_name}</h1>
          <p>
            <b>TC:</b> {patient.tc_no || '-'} • <b>Kat/Oda/Yatak:</b> {patient.floor_no || '-'} / {patient.room_no || '-'} / {patient.bed_no || '-'} • <b>Alarm:</b> {patient.alarm_no || '-'}
          </p>
          <p>
            <b>Yakın:</b> {patient.relative_name || '-'} • {patient.relative_phone || '-'} • <b>Doktor:</b> {patient.doctor_name || '-'}
          </p>
          <p>
            <b>Tanılar:</b> {patient.diagnoses || '-'} • <b>Alerji:</b> {patient.allergies || '-'}
          </p>
        </div>
        <div className="qrBox">
          <b>Hasta Dosyası 360°</b><br />
          <span className={`pill ${missing.length ? 'danger' : 'ok'}`}>
            {missing.length ? `Eksik Evrak: ${missing.length}` : 'Evrak Tam'}
          </span>
        </div>
      </div>

      <div className="panel">
        <div className="actions" style={{ marginTop: 0 }}>
          {tabs.map(([key, label]) => (
            <button key={key} className={tab === key ? 'primary' : 'soft'} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'summary' && (
        <div className="grid grid3">
          <div className="panel">
            <h2>Hasta Özeti</h2>
            <p><b>Durum:</b> {patient.status || 'Aktif'}</p>
            <p><b>Yakın:</b> {patient.relative_name || '-'}</p>
            <p><b>Telefon:</b> {patient.relative_phone || '-'}</p>
          </div>
          <div className="panel">
            <h2>Klinik Özet</h2>
            <p>Aktif ilaç: {(data.meds || []).filter((m: any) => m.status !== 'stopped').length}</p>
            <p>Tedavi kayıt: {(data.treatments || []).length}</p>
            <p>Vital kayıt: {(data.vitals || []).length}</p>
            <p>Olay kayıt: {(data.incidents || []).length}</p>
          </div>
          <div className="panel">
            <h2>Eksik Evrak</h2>
            {missing.length ? missing.map((m) => <div className="notice" key={m}>{m} eksik</div>) : <span className="pill ok">Zorunlu evraklar tamam</span>}
          </div>
        </div>
      )}

      {tab === 'meds' && <Table rows={data.meds || []} cols={['drug_name','daily_use','stock','min_stock','status']} labels={['İlaç','Kullanım','Stok','Min','Durum']} />}
      {tab === 'treatments' && <Table rows={data.treatments || []} cols={['treatment_date','treatment_time','treatment_type','treatment_name','route','dose','frequency','status','applied_by','note']} labels={['Tarih','Saat','Tür','Tedavi','Yol','Doz','Sıklık','Durum','Uygulayan','Not']} />}
      {tab === 'docs' && (
        <div className="panel">
          <h2>Evraklar</h2>
          <div className="tableWrap">
            <table>
              <thead><tr><th>Tarih</th><th>Kategori</th><th>Başlık</th><th>Not</th><th>Dosya</th></tr></thead>
              <tbody>
                {(data.docs || []).map((d: any) => (
                  <tr key={d.id}>
                    <td>{new Date(d.created_at).toLocaleString('tr-TR')}</td>
                    <td>{d.category}</td>
                    <td>{d.title || '-'}</td>
                    <td>{d.note || '-'}</td>
                    <td>{d.storage_path ? <button className="soft" onClick={() => openDoc(d.storage_path)}>Aç</button> : '-'}</td>
                  </tr>
                ))}
                {(data.docs || []).length === 0 && <tr><td colSpan={5}>Kayıt yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'vitals' && <Table rows={data.vitals || []} cols={['measured_at','systolic','diastolic','pulse','temperature','spo2','blood_glucose']} labels={['Zaman','Sys','Dia','Nabız','Ateş','SpO2','Şeker']} dateCols={['measured_at']} />}
      {tab === 'incidents' && <Table rows={data.incidents || []} cols={['incident_at','incident_type','location','severity','description']} labels={['Zaman','Tür','Yer','Şiddet','Açıklama']} dateCols={['incident_at']} />}
      {tab === 'transfers' && <Table rows={data.transfers || []} cols={['transfer_at','hospital_name','reason','companion','status','return_at']} labels={['Gidiş','Hastane','Neden','Refakatçi','Durum','Dönüş']} dateCols={['transfer_at','return_at']} />}
      {tab === 'care' && <Table rows={data.care || []} cols={['care_at','care_type','status','performed_by','note']} labels={['Zaman','Bakım','Durum','Yapan','Not']} dateCols={['care_at']} />}
      {tab === 'nutrition' && <Table rows={data.nutrition || []} cols={['record_at','meal_type','intake_status','fluid_ml','diet_note']} labels={['Zaman','Öğün','Alım','Sıvı','Not']} dateCols={['record_at']} />}
      {tab === 'wound' && <Table rows={data.wound || []} cols={['record_at','wound_location','wound_stage','dressing_type','status','wound_note']} labels={['Zaman','Yer','Evre','Pansuman','Durum','Not']} dateCols={['record_at']} />}
      {tab === 'tasks' && <Table rows={data.tasks || []} cols={['task_type','title','due_at','priority','status','assigned_to']} labels={['Tür','Başlık','Termin','Öncelik','Durum','Atanan']} dateCols={['due_at']} />}
    </Shell>
  );
}

function Table({ rows, cols, labels, dateCols = [] }: { rows: any[]; cols: string[]; labels: string[]; dateCols?: string[] }) {
  return (
    <div className="panel">
      <div className="panelHead">
        <div>
          <h2>Kayıtlar</h2>
          <p>{rows.length} kayıt</p>
        </div>
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>{labels.map((label) => <th key={label}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id}>
                {cols.map((col) => (
                  <td key={col}>{dateCols.includes(col) && row[col] ? new Date(row[col]).toLocaleString('tr-TR') : (row[col] || '-')}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length}>Kayıt yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
