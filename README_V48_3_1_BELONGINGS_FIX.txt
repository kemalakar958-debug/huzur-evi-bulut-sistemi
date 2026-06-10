v48.3.1 Belongings Duplicate Fix

Hata:
app/belongings/page.tsx içinde patient_id iki kez insert ediliyordu.

Çözüm:
form içindeki patient_id temizlendi, insert sırasında sadece patient.id gönderiliyor.

Kurulum:
1. ZIP'i aç.
2. app klasörünü GitHub ana dizinine yükle.
3. app/belongings/page.tsx üzerine yaz.
4. Commit yap.
5. Vercel yeniden deploy etsin.

SQL gerekmez.
