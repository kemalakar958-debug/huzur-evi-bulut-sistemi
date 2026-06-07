'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = { id:string; facility_id:string; full_name:string };
type DocumentRow = { id:string; category:string; title:string|null; note:string|null; created_at:string };

export default function DocumentsPage() {
  const [patients,setPatients]=useState<Patient[]>([]);
  const [docs,setDocs]=useState<DocumentRow[]>([]);
  const [form,setForm]=useState({patient_id:'',category:'Medula PDF',title:'',note:''});

  useEffect(()=>{load()},[]);
  async function load(){
    const {data:p}=await supabase.from('patients').select('id,facility_id,full_name').order('full_name'); setPatients(p||[]);
    if(p?.[0]) setForm(o=>({...o,patient_id:o.patient_id||p[0].id}));
    const {data:d}=await supabase.from('documents').select('*').order('created_at',{ascending:false}); setDocs(d||[]);
  }
  async function saveDoc(){
    const p=patients.find(x=>x.id===form.patient_id); if(!p)return alert('Hasta seç.');
    const {error}=await supabase.from('documents').insert({facility_id:p.facility_id,patient_id:p.id,category:form.category,title:form.title,note:form.note,storage_path:null});
    if(error)return alert(error.message);
    setForm(o=>({...o,title:'',note:''})); await load();
  }
  return <Shell><div className="hero"><h2>Evrak ve Medula Merkezi</h2><p>Medula PDF, kimlik, epikriz, reçete ve kurum evrak kayıtları.</p></div><div className="panel"><div className="panelHead"><div><h2>Evrak Kaydı Ekle</h2><p>Bu sürüm kayıt açar; dosya yükleme bir sonraki adımda storage ile aktif edilir.</p></div></div><div className="grid grid4"><div><label>Hasta</label><select value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})}>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div><div><label>Kategori</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Medula PDF</option><option>Kimlik</option><option>Epikriz</option><option>Reçete</option><option>Tetkik</option><option>Diğer</option></select></div><div><label>Başlık</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div><div><label>Not</label><input value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></div></div><div className="actions"><button className="primary" onClick={saveDoc}>Evrak Kaydı Oluştur</button></div></div><div className="panel"><div className="panelHead"><div><h2>Evrak Listesi</h2><p>{docs.length} kayıt</p></div></div><div className="tableWrap"><table><thead><tr><th>Tarih</th><th>Kategori</th><th>Başlık</th><th>Not</th></tr></thead><tbody>{docs.map(d=><tr key={d.id}><td>{new Date(d.created_at).toLocaleString('tr-TR')}</td><td>{d.category}</td><td>{d.title||'-'}</td><td>{d.note||'-'}</td></tr>)}</tbody></table></div></div></Shell>
}
