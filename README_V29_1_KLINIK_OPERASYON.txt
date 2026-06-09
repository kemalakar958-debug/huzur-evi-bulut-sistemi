v29.1 Klinik Operasyon Paketi

Eklenen modüller:
- Vital Takip
- Olay / Düşme Kaydı
- Hastane Sevk Modülü
- Sol menü güncellemesi
- Mobil alt menü güncellemesi

Kurulum:
1. Zip'i aç.
2. app, components ve supabase klasörlerini GitHub projenizin ana dizinine yükleyin.
3. Aynı isimli dosyalar varsa üzerine yazın.
4. supabase/schema_v29_1_clinical.sql dosyasındaki SQL'i Supabase SQL Editor'da çalıştırın.
5. GitHub commit sonrası Vercel otomatik deploy yapar.
6. Deploy Ready olunca siteyi yenileyin.

Test:
- Vital Takip sayfasında hasta seçip tansiyon/nabız kaydı girin.
- Olay / Düşme sayfasında düşme kaydı girin.
- Hastane Sevk sayfasında sevk oluşturun, sonra Kuruma Döndü ile kapatın.
