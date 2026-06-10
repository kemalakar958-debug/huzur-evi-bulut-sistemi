v48.3.2 Hospital Cases Duplicate Fix

Hata:
app/hospital-cases/page.tsx içinde patient_id iki kez insert ediliyordu.

Çözüm:
form içindeki patient_id temizlendi, insert sırasında sadece patient.id gönderiliyor.

Kurulum:
1. ZIP'i aç.
2. app klasörünü GitHub ana dizinine yükle.
3. app/hospital-cases/page.tsx üzerine yaz.
4. Commit yap.
5. Vercel yeniden deploy etsin.

SQL gerekmez.
