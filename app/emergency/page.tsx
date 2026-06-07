'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Patient = {
  id:string; full_name:string; room_no?:string; bed_no?:string; alarm_no?:string;
  relative_name?:string; relative_phone?:string; allergies?:string; diagnoses?:string;
};

export default function EmergencyPage(){
  const [patients,setPatients]=useState<Patient[]>([]);
  useEffect(()=>{load()},[]);
  async function load(){const {data}=await supabase.from('patients').select('*').order('full_name');setPatients(data||[])}
  return <Shell><div className="hero"><h2>Acil Durum Merkezi</h2><p>Hasta acil kartı, yakın bilgisi, alerji, tanılar ve aktif konum bilgileri.</p></div><div className="grid grid3">{patients.map(p=><div className="emergencyCard" key={p.id}><h2>{p.full_name}</h2><p><b>Oda/Yatak:</b> {p.room_no||'-'} / {p.bed_no||'-'}</p><p><b>Alarm:</b> {p.alarm_no||'-'}</p><p><b>Yakın:</b> {p.relative_name||'-'} • {p.relative_phone||'-'}</p><p><b>Alerji:</b> {p.allergies||'-'}</p><p><b>Tanılar:</b> {p.diagnoses||'-'}</p><Link className="btn red" href={`/patients/${p.id}`}>Hasta Dosyasını Aç</Link></div>)}</div></Shell>
}
