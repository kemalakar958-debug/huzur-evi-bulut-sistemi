'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email || !password) {
      alert('E-posta ve şifre gir.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <>
      <main className="loginPage">
        <div className="loginOverlay" />

        <section className="loginBrand">
          <div className="brandBadge">🏥</div>
          <h1>Huzur Sistemi</h1>
          <p>Huzurevi ve yaşlı bakım merkezi yönetim sistemi</p>

          <div className="brandList">
            <span>Hasta Yönetimi</span>
            <span>Tedavi Takibi</span>
            <span>Hastane Süreçleri</span>
            <span>Kurum Operasyon Paneli</span>
          </div>
        </section>

        <section className="loginCard">
          <div className="loginCardHeader">
            <div className="loginIcon">🏥</div>
            <div>
              <h2>Huzur Sistemi</h2>
              <p>Yetkili personel girişi</p>
            </div>
          </div>

          <label>E-posta</label>
          <input
            type="email"
            placeholder="ornek@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Şifre</label>
          <input
            type="password"
            placeholder="Şifreniz"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') login();
            }}
          />

          <button onClick={login} disabled={loading}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>

          <div className="loginFooter">
            <span>Kurumsal güvenli giriş</span>
          </div>
        </section>
      </main>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; }

        .loginPage {
          min-height: 100vh;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 40px;
          padding: 60px;
          background-image: url('/login-bg.png');
          background-size: cover;
          background-position: center;
          overflow: hidden;
        }

        .loginOverlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.12)),
            linear-gradient(0deg, rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.25));
          z-index: 0;
        }

        .loginBrand,
        .loginCard {
          position: relative;
          z-index: 1;
        }

        .loginBrand {
          max-width: 560px;
          color: white;
        }

        .brandBadge {
          width: 70px;
          height: 70px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          margin-bottom: 22px;
          backdrop-filter: blur(10px);
        }

        .loginBrand h1 {
          margin: 0;
          font-size: 50px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .loginBrand p {
          margin: 16px 0 0;
          font-size: 19px;
          color: rgba(255, 255, 255, 0.88);
          font-weight: 600;
        }

        .brandList {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 30px;
        }

        .brandList span {
          display: block;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(10px);
          color: rgba(255, 255, 255, 0.95);
          font-weight: 800;
        }

        .loginCard {
          width: 420px;
          flex: 0 0 420px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.75);
          border-radius: 28px;
          padding: 30px;
          box-shadow: 0 30px 90px rgba(15, 23, 42, 0.35);
          backdrop-filter: blur(16px);
        }

        .loginCardHeader {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 26px;
        }

        .loginIcon {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
        }

        .loginCard h2 {
          margin: 0;
          color: #0f172a;
          font-size: 28px;
          font-weight: 900;
        }

        .loginCard p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 14px;
          font-weight: 700;
        }

        .loginCard label {
          display: block;
          margin: 16px 0 7px;
          color: #334155;
          font-size: 13px;
          font-weight: 900;
        }

        .loginCard input {
          width: 100%;
          height: 50px;
          border-radius: 16px;
          border: 1px solid #cbd5e1;
          background: white;
          padding: 0 15px;
          color: #0f172a;
          font-size: 15px;
          outline: none;
        }

        .loginCard input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .loginCard button {
          width: 100%;
          height: 52px;
          margin-top: 22px;
          border: none;
          border-radius: 16px;
          background: #1d4ed8;
          color: white;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .loginCard button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .loginFooter {
          margin-top: 18px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 950px) {
          .loginPage {
            flex-direction: column;
            justify-content: center;
            padding: 28px;
          }

          .loginBrand {
            max-width: 100%;
            text-align: center;
          }

          .brandBadge {
            margin-left: auto;
            margin-right: auto;
          }

          .loginBrand h1 {
            font-size: 36px;
          }

          .brandList {
            grid-template-columns: 1fr;
          }

          .loginCard {
            width: 100%;
            max-width: 430px;
            flex: none;
          }
        }
      `}</style>
    </>
  );
}
