'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = { id:string; facility_id:string; full_name:string };
type Row = any;

export default function Page() {
  const [patients,setPatients]=useState<Patient[]>([]);
  const [rows,setRows]=useState<Row[]>([]);
  const [form,setForm]=useState<any>({patient_id:'',transfer_at:'',hospital_name:'',reason:'',companion:'',transport_type:'',status:''});

  useEffect(()=>{load();},[]);
  async function load(){
    const {data:p}=await supabase.from('patients').select('id,facility_id,full_name').order('full_name');
    setPatients(p||[]);
    if(p?.[0])setForm((o:any)=>({...o,patient_id:o.patient_id||p[0].id}));
    const {data:r}=await supabase.from('hospital_transfers').select('*').order('created_at',{ascending:false}).limit(200);
    setRows(r||[]);
  }
  async function save(){
    const p=patients.find(x=>x.id===form.patient_id);
    if(!p)return alert('Hasta seç.');
    const payload:any={facility_id:p.facility_id,patient_id:p.id,patient_name:p.full_name};
    for(const k of Object.keys(form)){ if(k!=='patient_id') payload[k]=form[k]||null; }
    if(!payload.status) payload.status='Aktif';
    const {error}=await supabase.from('hospital_transfers').insert(payload);
    if(error)return alert(error.message);
    setForm((o:any)=>{ const n:any={...o}; for(const k of Object.keys(n)) if(k!=='patient_id') n[k]=''; return n; });
    await load();
  }
  async function complete(id:string){
    await supabase.from('hospital_transfers').update({status:'Tamamlandı', completed_at:new Date().toISOString()}).eq('id',id);
    await load();
  }
  return <Shell>
    <div className="hero"><h2>Hastane Sevk Modülü</h2><p>Sevk nedeni, hastane, refakatçi, gidiş-dönüş ve sonuç kaydı.</p></div>
    <div className="kpiGrid"><div className="kpi"><span>Toplam</span><strong>{rows.length}</strong></div><div className="kpi"><span>Aktif</span><strong>{rows.filter(r=>r.status==='Aktif'||r.status==='Bekliyor').length}</strong></div><div className="kpi"><span>Tamamlanan</span><strong>{rows.filter(r=>r.status==='Tamamlandı').length}</strong></div><div className="kpi"><span>Hasta</span><strong>{patients.length}</strong></div></div>
    <div className="panel"><div className="panelHead"><div><h2>Yeni Kayıt</h2><p>Hasta seçerek kayıt oluştur.</p></div></div>
      <div className="grid grid4"><div><label>Hasta</label><select value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})}>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div><div><label>Gidiş Zamanı</label><input type="datetime-local" value={form.transfer_at} onChange={e=>setForm({...form,transfer_at:e.target.value})} /></div><div><label>Hastane</label><input value={form.hospital_name} onChange={e=>setForm({...form,hospital_name:e.target.value})} /></div><div><label>Sevk Nedeni</label><textarea value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} /></div><div><label>Refakatçi</label><input value={form.companion} onChange={e=>setForm({...form,companion:e.target.value})} /></div><div><label>Ulaşım</label><select value={form.transport_type} onChange={e=>setForm({...form,transport_type:e.target.value})}><option>Ambulans</option><option>Özel Araç</option><option>Taksi</option><option>Diğer</option></select></div><div><label>Durum</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Hastanede</option><option>Kuruma Döndü</option><option>İptal</option></select></div></div>
      <div className="actions"><button className="primary" onClick={save}>Kaydet</button></div>
    </div>
    <div className="panel"><div className="panelHead"><div><h2>Kayıtlar</h2><p>Son 200 kayıt</p></div></div>
      <div className="tableWrap"><table><thead><tr><th>Zaman</th><th>Hasta</th><th>Gidiş Zamanı</th><th>Hastane</th><th>Sevk Nedeni</th><th>Refakatçi</th><th>Ulaşım</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString('tr-TR')} </td><td><b>{r.patient_name}</b></td><td>{r.transfer_at||'-'}</td><td>{r.hospital_name||'-'}</td><td>{r.reason||'-'}</td><td>{r.companion||'-'}</td><td>{r.transport_type||'-'}</td><td><span className={`pill ${r.status==='Tamamlandı'||r.status==='Aktif'||r.status==='Normal'?'ok':'warn'}`}>{r.status||'-'}</span></td></td><td>{r.status!=='Tamamlandı'?<button className="green" onClick={()=>complete(r.id)}>Tamamla</button>:'-'}</td></tr>)}{rows.length===0&&<tr><td colSpan={9}>Kayıt yok.</td></tr>}</tbody></table></div>
    </div>
  </Shell>
}
