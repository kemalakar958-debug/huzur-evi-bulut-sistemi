'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Facility = { id:string; name:string };
type Profile = { id:string; full_name:string|null; role:string; facility_id:string|null };

export default function UsersPage(){
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [facilities,setFacilities]=useState<Facility[]>([]);
  const [form,setForm]=useState({id:'',full_name:'',role:'nurse',facility_id:''});

  useEffect(()=>{load()},[]);
  async function load(){
    const {data:f}=await supabase.from('facilities').select('*').order('name'); setFacilities(f||[]);
    const {data:p}=await supabase.from('profiles').select('*').order('full_name'); setProfiles(p||[]);
  }
  async function saveProfile(){
    if(!form.id)return alert('Auth Users kısmındaki kullanıcı ID zorunlu.');
    const payload={id:form.id,full_name:form.full_name,role:form.role,facility_id:form.role==='founder'?null:(form.facility_id||null)};
    const {error}=await supabase.from('profiles').upsert(payload);
    if(error)return alert(error.message);
    setForm({id:'',full_name:'',role:'nurse',facility_id:''}); await load();
  }
  return <Shell><div className="hero"><h2>Kullanıcı Yetki Merkezi</h2><p>Kurucu, müdür, hemşire ve görüntüleyici rollerini yönet.</p></div><div className="panel"><div className="panelHead"><div><h2>Profil / Rol Tanımla</h2><p>Önce Supabase Authentication Users kısmında kullanıcı oluştur, sonra ID'yi buraya gir.</p></div></div><div className="grid grid4"><div><label>User ID</label><input value={form.id} onChange={e=>setForm({...form,id:e.target.value})}/></div><div><label>Ad Soyad</label><input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></div><div><label>Rol</label><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="founder">Kurucu</option><option value="manager">Müdür</option><option value="nurse">Hemşire</option><option value="viewer">Görüntüleyici</option></select></div><div><label>Kurum</label><select value={form.facility_id} onChange={e=>setForm({...form,facility_id:e.target.value})}><option value="">Kurucu / Kurumsuz</option>{facilities.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></div></div><div className="actions"><button className="primary" onClick={saveProfile}>Rol Kaydet</button></div></div><div className="panel"><div className="panelHead"><div><h2>Kullanıcı Profilleri</h2><p>{profiles.length} kayıt</p></div></div><div className="tableWrap"><table><thead><tr><th>Ad</th><th>Rol</th><th>Kurum ID</th><th>User ID</th></tr></thead><tbody>{profiles.map(p=><tr key={p.id}><td>{p.full_name}</td><td>{p.role}</td><td>{p.facility_id||'-'}</td><td>{p.id}</td></tr>)}</tbody></table></div></div></Shell>
}
