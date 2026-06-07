'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('Bağlantı kontrol ediliyor...');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMessage(data.session ? 'Yeni şifreni yazabilirsin.' : 'Oturum bulunamadı. Link süresi dolmuş olabilir.');
    });
  }, []);

  async function updatePassword() {
    if (password.length < 6) return setMessage('Şifre en az 6 karakter olmalı.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMessage('Hata: ' + error.message);
    setMessage('Şifre güncellendi. Giriş ekranına dönebilirsin.');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 18 }}>
      <div className="panel" style={{ width: 440, maxWidth: '100%' }}>
        <h1>Yeni Şifre Belirle</h1>
        <label>Yeni Şifre</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="actions">
          <button className="primary" onClick={updatePassword}>Şifreyi Güncelle</button>
          <Link className="btn soft" href="/login">Girişe Dön</Link>
        </div>
        {message && <div className="notice">{message}</div>}
      </div>
    </div>
  );
}
