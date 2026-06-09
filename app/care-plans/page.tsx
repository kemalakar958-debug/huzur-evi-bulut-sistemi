'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = { id:string; facility_id:string; full_name:string };
type Row = any;

export default function Page() {
  const [patients,setPatients]=useState<Patient[]>([]);
  const [rows,setRows]=useState<Row[]>([]);
  const [form,setForm]=useState<any>({patient_id:'',plan_type:'',risk_level:'',goal:'',plan_note:'',responsible:'',review_date:''});

  useEffect(()=>{load();},[]);
  async function load(){
    const {data:p}=await supabase.from('patients').select('id,facility_id,full_name').order('full_name');
    setPatients(p||[]);
    if(p?.[0])setForm((o:any)=>({...o,patient_id:o.patient_id||p[0].id}));
    const {data:r}=await supabase.from('care_plans').select('*').order('created_at',{ascending:false}).limit(200);
    setRows(r||[]);
  }
  async function save(){
    const p=patients.find(x=>x.id===form.patient_id);
    if(!p)return alert('Hasta seç.');
    const payload:any={facility_id:p.facility_id,patient_id:p.id,patient_name:p.full_name};
    for(const k of Object.keys(form)){ if(k!=='patient_id') payload[k]=form[k]||null; }
    if(!payload.status) payload.status='Aktif';
    const {error}=await supabase.from('care_plans').insert(payload);
    if(error)return alert(error.message);
    setForm((o:any)=>{ const n:any={...o}; for(const k of Object.keys(n)) if(k!=='patient_id') n[k]=''; return n; });
    await load();
  }
  async function complete(id:string){
    await supabase.from('care_plans').update({status:'Tamamlandı', completed_at:new Date().toISOString()}).eq('id',id);
    await load();
  }
  return <Shell>
    <div className="hero"><h2>Bakım Planı</h2><p>Hasta bazlı bakım hedefi, risk, plan ve takip sorumlusu.</p></div>
    <div className="kpiGrid"><div className="kpi"><span>Toplam</span><strong>{rows.length}</strong></div><div className="kpi"><span>Aktif</span><strong>{rows.filter(r=>r.status==='Aktif'||r.status==='Bekliyor').length}</strong></div><div className="kpi"><span>Tamamlanan</span><strong>{rows.filter(r=>r.status==='Tamamlandı').length}</strong></div><div className="kpi"><span>Hasta</span><strong>{patients.length}</strong></div></div>
    <div className="panel"><div className="panelHead"><div><h2>Yeni Kayıt</h2><p>Hasta seçerek kayıt oluştur.</p></div></div>
      <div className="grid grid4"><div><label>Hasta</label><select value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})}>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div><div><label>Plan Türü</label><select value={form.plan_type} onChange={e=>setForm({...form,plan_type:e.target.value})}><option>Genel Bakım</option><option>Düşme Riski</option><option>Bası Riski</option><option>Beslenme</option><option>Mobilizasyon</option><option>Hijyen</option><option>Diğer</option></select></div><div><label>Risk</label><select value={form.risk_level} onChange={e=>setForm({...form,risk_level:e.target.value})}><option>Düşük</option><option>Orta</option><option>Yüksek</option><option>Kritik</option></select></div><div><label>Hedef</label><textarea value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} /></div><div><label>Plan Notu</label><textarea value={form.plan_note} onChange={e=>setForm({...form,plan_note:e.target.value})} /></div><div><label>Sorumlu</label><input value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})} /></div><div><label>Gözden Geçirme</label><input type="date" value={form.review_date} onChange={e=>setForm({...form,review_date:e.target.value})} /></div></div>
      <div className="actions"><button className="primary" onClick={save}>Kaydet</button></div>
    </div>
    <div className="panel"><div className="panelHead"><div><h2>Kayıtlar</h2><p>Son 200 kayıt</p></div></div>
      <div className="tableWrap"><table><thead><tr><th>Zaman</th><th>Hasta</th><th>Plan Türü</th><th>Risk</th><th>Hedef</th><th>Plan Notu</th><th>Sorumlu</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString('tr-TR')} </td><td><b>{r.patient_name}</b></td><td>{r.plan_type||'-'}</td><td>{r.risk_level||'-'}</td><td>{r.goal||'-'}</td><td>{r.plan_note||'-'}</td><td>{r.responsible||'-'}</td><td><span className={`pill ${r.status==='Tamamlandı'||r.status==='Aktif'||r.status==='Normal'?'ok':'warn'}`}>{r.status||'-'}</span></td></td><td>{r.status!=='Tamamlandı'?<button className="green" onClick={()=>complete(r.id)}>Tamamla</button>:'-'}</td></tr>)}{rows.length===0&&<tr><td colSpan={9}>Kayıt yok.</td></tr>}</tbody></table></div>
    </div>
  </Shell>
}
