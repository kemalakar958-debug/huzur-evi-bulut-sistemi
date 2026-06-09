v33.1 Tedavi Sistemi 404 Düzeltme

Bu paket /treatments sayfasının 404 vermesini düzeltir.

Kurulum:
1. ZIP'i aç.
2. İçindeki app klasörünü GitHub ana dizinine yükle.
3. Aynı dosyalar varsa üzerine yaz.
4. Commit changes yap.
5. Vercel deploy Ready olunca /treatments açılır.

SQL:
Eğer treatment_records tablosu yoksa Supabase SQL Editor'da:
supabase/schema_v33_1_treatment_fix.sql
dosyasındaki kodu çalıştır.
