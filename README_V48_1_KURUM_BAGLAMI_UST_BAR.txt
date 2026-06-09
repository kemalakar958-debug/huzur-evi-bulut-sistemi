v48.1 Kurum Bağlamı Üst Barı

Amaç:
- Hemşire hangi kuruma atandıysa üstte o kurum adı görünsün.
- Müdür hangi kuruma atandıysa üstte o kurum adı görünsün.
- Founder genel kontrol yapıyorsa "Genel Kontrol" yazsın.
- Founder İlgi 2 seçerse üstte "İlgi 2" yazsın.
- Founder Ege Nefes seçerse üstte "Ege Nefes" yazsın.

Eklenen / güncellenen dosyalar:
- components/Topbar.tsx
- components/Shell.tsx
- components/v48_1_topbar_styles.css

ÖNEMLİ:
CSS dosyasının aktif olması için app/globals.css içine aşağıdaki satırı en alta ekle:

@import '../components/v48_1_topbar_styles.css';

Kurulum:
1. ZIP'i aç.
2. components klasörünü GitHub ana dizinine yükle.
3. components/Shell.tsx dosyası varsa üzerine yaz.
4. components/Topbar.tsx eklensin.
5. components/v48_1_topbar_styles.css eklensin.
6. app/globals.css içine import satırını ekle.
7. Commit changes yap.
8. Vercel deploy etsin.

SQL gerekmez.
