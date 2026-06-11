v51.1 Hatırlatıcı Yetki Düzeltme

Değişiklik:
- Hasta Hastane Randevusu: hemşire, müdür, kurucu görür/yazar.
- Hasta Görüşmesi: sadece müdür ve kurucu görür/yazar.
- Personel Görüşmesi: sadece müdür ve kurucu görür/yazar.

Kurulum:
1. ZIP'i aç.
2. app ve supabase klasörlerini GitHub ana dizinine yükle.
3. app/reminders/page.tsx üzerine yaz.
4. Commit yap.
5. Supabase SQL Editor'da supabase/schema_v51_1_reminder_permissions.sql içeriğini çalıştır.
6. Vercel deploy etsin.

SQL veri silmez.
