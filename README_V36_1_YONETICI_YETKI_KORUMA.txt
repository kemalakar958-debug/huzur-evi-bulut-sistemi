v36.1 Yönetici Yetki Koruma

Eklenenler:
- AdminGuard bileşeni
- /management sadece founder/manager
- /facilities sadece founder/manager
- Hemşire kullanıcılarına yetki uyarısı
- Kurum dışı verilere RLS engeli devam eder

Kurulum:
1. ZIP'i aç.
2. app, components ve supabase klasörlerini GitHub ana dizinine yükle.
3. Aynı dosyalar varsa üzerine yaz.
4. Commit changes yap.
5. Supabase SQL Editor'da supabase/schema_v36_1_admin_permissions.sql çalıştır.
6. Vercel deploy Ready olunca test et.

Test:
- founder veya manager rolü ile /management açılmalı.
- nurse rolü ile /management ve /facilities yetki uyarısı vermeli.
