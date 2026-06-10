v48.3 Ana Ekranlar Aktif Kurum Filtresi

Bu paket aktif kurum filtresini ana ekranlara bağlar.

Founder:
- Üst bardan "Genel Kontrol" seçerse tüm kurum verilerini görür.
- Üst bardan "İlgi 2" seçerse sadece İlgi 2 verilerini görür.
- Üst bardan "Ege Nefes" seçerse sadece Ege Nefes verilerini görür.

Manager / Nurse / Viewer:
- Otomatik kendi atanmış kurumunu görür.

Güncellenen sayfalar:
- /patients
- /treatments
- /depot
- /documents
- /belongings
- /incidents
- /hospital-cases

Eklenen / güncellenen:
- lib/activeFacility.ts

Kurulum:
1. ZIP'i aç.
2. app ve lib klasörlerini GitHub ana dizinine yükle.
3. Aynı dosyalar varsa üzerine yaz.
4. Commit changes yap.
5. Vercel deploy etsin.
6. Founder ile giriş yapıp üst bardan kurum değiştirerek test et.

Test sırası:
1. Founder → Genel Kontrol → Hasta listesinde tüm kurumlar görünmeli.
2. Founder → İlgi 2 → sadece İlgi 2 hastaları görünmeli.
3. Hemşire → sadece kendi kurumu görünmeli.
4. Depo/Tedavi/Evrak/Emanet/Olay/Hastane süreçleri aynı şekilde filtrelenmeli.

SQL gerekmez.
