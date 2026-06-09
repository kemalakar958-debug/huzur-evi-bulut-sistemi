v47 Hastane Süreç Merkezi

Eklenenler:
- /hospital-cases sayfası
- Hastaneye gidiş kaydı
- Hastanede durum takibi
- Hastaneden dönüş kaydı
- Epikriz / reçete / tetkik dosya yükleme
- Hastayı sevk sırasında Hastanede durumuna alma
- Dönüşte hastayı Aktif durumuna alma
- hospital_cases tablosu
- hospital_documents tablosu
- hospital_followups tablosu
- hospital-documents storage bucket

Kurulum:
1. ZIP'i aç.
2. app, components ve supabase klasörlerini GitHub ana dizinine yükle.
3. Aynı dosyalar varsa üzerine yaz.
4. Commit changes yap.
5. Supabase SQL Editor'da supabase/schema_v47_hospital_cases.sql çalıştır.
6. Vercel deploy Ready olunca /hospital-cases aç.

Not:
Hasta 360 içine tam entegrasyonu v47.1'de yapacağız. Önce ana hastane sürecini canlıda test edelim.
