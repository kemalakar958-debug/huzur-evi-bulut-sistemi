v42 Rol Bazlı Panel / Kurum Yetkilendirme

Eklenenler:
- RoleGuard bileşeni
- Rol bazlı Sidebar
- /my-panel: müdür/hemşire/viewer için kendi kurum paneli
- /role-settings: sadece founder için rol ve kurum atama ekranı
- Menülerin role göre görünmesi
- Founder tüm kurumları görür
- Manager sadece kendi kurumunu görür
- Nurse sadece kendi kurumunu görür
- Viewer sadece kendi kurumunu görüntüler

Kurulum:
1. ZIP'i aç.
2. app, components ve supabase klasörlerini GitHub ana dizinine yükle.
3. Aynı dosyalar varsa üzerine yaz.
4. Commit changes yap.
5. Supabase SQL Editor'da supabase/schema_v42_role_based_panels.sql çalıştır.
6. Vercel deploy Ready olunca:
   - founder ile /role-settings aç
   - kullanıcıları role ve kuruma ata
   - manager/nurse ile giriş yapıp menüyü kontrol et

SQL veri silmez.
