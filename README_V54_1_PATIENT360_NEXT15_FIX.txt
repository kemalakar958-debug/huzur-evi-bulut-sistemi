v54.1 Patient 360 Next.js 15 Params Fix

Hata:
app/patients/[id]/page.tsx içinde params tipi Next.js 15 ile uyumsuzdu.

Çözüm:
- page.tsx server component oldu.
- params await edildi.
- Hasta 360 ekranı Patient360Client.tsx içine taşındı.

Kurulum:
1. ZIP'i aç.
2. app klasörünü GitHub ana dizinine yükle.
3. app/patients/[id]/page.tsx üzerine yaz.
4. app/patients/[id]/Patient360Client.tsx eklensin.
5. Commit yap.
6. Vercel deploy etsin.

SQL gerekmez.
