Huzurevi Bulut Sistemi v28 Güncelleme Paketi

Bu paket mevcut v27 projenin üzerine yüklenecek güncelleme dosyalarını içerir.

Eklenenler:
- Şifre sıfırlama ekranı
- Yeni şifre belirleme ekranı
- Kurucu Dashboard 2.0
- Evrak / Medula kayıt merkezi
- Acil durum merkezi
- Kullanıcı yetki merkezi
- Mobil alt hızlı menü

Kurulum:
1. Zip'i aç.
2. İçindeki klasörleri GitHub projenin kök dizinine yükle.
3. Aynı isimli dosyalar varsa üzerine yaz.
4. app/globals_add_v28.css içindeki CSS'i mevcut app/globals.css dosyasının en altına ekle.
5. supabase/schema_v28_upgrade.sql dosyasını Supabase SQL Editor'da çalıştır.
6. Supabase > Authentication > URL Configuration:
   Site URL: https://SENIN-SITEN.vercel.app
   Redirect URLs:
   https://SENIN-SITEN.vercel.app/**
   https://SENIN-SITEN.vercel.app/update-password
7. Vercel otomatik deploy yapar. Hata olursa Build Logs son satırlarını kontrol et.
