v48 Kapalı Kullanıcı Oluşturma / Yetki Paneli

Eklenenler:
- /user-admin sayfası
- Sadece founder erişimi
- Kullanıcı oluşturma
- Geçici şifre üretme
- Rol seçme
- Kurum seçme
- Kullanıcı aktif/pasif yapma
- Rol ve kurum değiştirme
- Menüye Kullanıcı Oluştur / Yetki eklendi

Güvenlik modeli:
- Açık üyelik yok.
- Çalışan kendi kendine üye olmaz.
- Founder kullanıcı oluşturur ve bilgileri personele verir.

Kurulum:
1. ZIP'i aç.
2. app, components ve supabase klasörlerini GitHub ana dizinine yükle.
3. Aynı dosyalar varsa üzerine yaz.
4. Commit changes yap.
5. Supabase SQL Editor'da supabase/schema_v48_user_admin.sql çalıştır.
6. Vercel deploy Ready olunca /user-admin aç.

Önemli:
Supabase Auth ayarlarında e-posta onayı açıksa yeni kullanıcı giriş yapmadan önce e-posta onayı isteyebilir.
Gerekirse Supabase > Authentication > Providers > Email ayarından confirm email kontrol edilir.
