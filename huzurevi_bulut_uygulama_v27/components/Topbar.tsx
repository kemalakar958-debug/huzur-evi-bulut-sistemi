'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
export default function Topbar(){const[email,setEmail]=useState('');useEffect(()=>{supabase.auth.getUser().then(({data})=>setEmail(data.user?.email||''))},[]);async function logout(){await supabase.auth.signOut();window.location.href='/login'}return <div className="topbar"><div className="searchBox">🔎 Bulut sistem aktif</div><div className="userBadge">{email||'Kullanıcı'}</div><button className="soft" onClick={logout}>Çıkış</button></div>}
