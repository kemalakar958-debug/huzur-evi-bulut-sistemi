v55.1 Hasta Ekle İşlevli Sürüm

Eklenen işlevler:
- Gerçek dosya seçme
- Kimlik ön/arka, Medula, Sağlık Raporu dosya yükleme
- Dosyaları Supabase Storage patient-documents bucket içine atma
- documents tablosuna evrak kaydı oluşturma
- TC tekrar kontrolü
- Oda/yatak doluluk kontrolü
- Zorunlu alan validasyonu
- Taslak kaydetme / geri yükleme
- Hasta kaydedilince Hasta 360 sayfasına yönlendirme
- Kabul kaydı oluşturma denemesi

Kurulum:
1. ZIP'i aç.
2. app ve supabase klasörlerini GitHub ana dizinine yükle.
3. app/patients/new/page.tsx üzerine yaz.
4. Commit yap.
5. Supabase SQL Editor'da supabase/schema_v55_1_patient_documents_storage.sql içeriğini çalıştır.
6. Vercel deploy etsin.

SQL veri silmez.
