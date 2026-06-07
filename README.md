# Huzurevi Klinik Bulut Uygulaması v27

Bu paket, önceki HTML/localStorage demo sistemini bulut veritabanı ve çoklu kullanıcı yapısına taşımak için hazırlanmış Next.js + Supabase başlangıç projesidir.

## İçindeki modüller

- Giriş sistemi
- Çoklu kurum altyapısı
- Hasta listesi
- İlaç giriş ve otomatik günlük düşüm
- Revir deposu
- Otomatik stok isteği
- Kurucu onay / teslim / depo iş akışı
- Supabase SQL tablo şeması
- Row Level Security yetki kuralları
- Gerçek zamanlı güncelleme altyapısı

## Kurulum

### 1. Supabase kur

1. Supabase hesabı aç.
2. New Project oluştur.
3. SQL Editor kısmına gir.
4. `supabase/schema.sql` dosyasındaki tüm kodu çalıştır.
5. Authentication > Users kısmından kullanıcı oluştur.
6. Kullanıcı ID değerini al.
7. schema.sql en altındaki kurucu kullanıcı satırını düzenleyip çalıştır.

### 2. Ortam dosyasını oluştur

`.env.example` dosyasını kopyala ve adını `.env.local` yap.

İçine Supabase bilgilerini yaz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
```

### 3. Çalıştır

```bash
npm install
npm run dev
```

Sonra aç:

```text
http://localhost:3000
```

### 4. Vercel'e yükle

1. Projeyi GitHub'a yükle.
2. Vercel hesabı aç.
3. GitHub projesini Vercel'e bağla.
4. Environment Variables alanına Supabase URL ve ANON KEY ekle.
5. Deploy yap.

## Önemli

Bu v27, bulut sistemin başlangıç iskeletidir. Önce hasta, ilaç, depo ve onay modülleri buluta taşındı.
Eski v26'daki tüm modüller tek tek bu yapıya aktarılabilir:
- Medula PDF
- Evrak arşivi
- Vital takip
- Hastane sevk
- Nöbet teslim
- MAR ilaç uygulama ekranı
- Yapay zeka analiz
