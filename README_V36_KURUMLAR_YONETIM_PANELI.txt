v36 Kurumlar / Yönetim Paneli

Amaç:
Sistemi sınırsız kurum destekli hale getirmek ve kurucu/müdür için merkezi yönetim ekranı oluşturmak.

Eklenenler:
- /facilities Kurumlar / Ayarlar Paneli
- /management Yönetim Paneli
- Sınırsız kurum ekleme
- Kurum düzenleme
- Kurum kapasitesi
- Kurum müdürü, sorumlu hemşire, doktor bilgileri
- Kurum bazlı hasta, ilaç, tedavi, evrak, depo, görev, emanet sayıları
- Kurucu/müdür için tüm kurum özet ekranı
- Sol menü düzenlemesi

Kurulum:
1. ZIP'i aç.
2. app, components ve supabase klasörlerini GitHub ana dizinine yükle.
3. Aynı dosyalar varsa üzerine yaz.
4. Commit changes yap.
5. Supabase SQL Editor'da supabase/schema_v36_facilities_management.sql çalıştır.
6. Vercel deploy Ready olunca siteyi yenile.

Not:
Bu paket veri silmez, mevcut facilities tablosuna kolon ekler.
