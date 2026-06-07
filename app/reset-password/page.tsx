'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function sendReset() {
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/update-password`,
    });
    if (error) return setMessage('Hata: ' + error.message);
    setMessage('Şifre yenileme linki e-postana gönderildi.');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 18 }}>
      <div className="panel" style={{ width: 440, maxWidth: '100%' }}>
        <h1>Şifre Yenile</h1>
        <p>E-posta adresini yaz, yeni şifre oluşturma bağlantısı gönderelim.</p>
        <label>E-posta</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@kurum.com" />
        <div className="actions">
          <button className="primary" onClick={sendReset}>Link Gönder</button>
          <Link className="btn soft" href="/login">Girişe Dön</Link>
        </div>
        {message && <div className="notice">{message}</div>}
      </div>
    </div>
  );
}
