v37 Kurumlar Arası Stok İstek / Transfer

Senaryo:
- İlgi 2 istek oluşturur.
- Patron/founder tüm istekleri görür.
- Patron onaylar veya reddeder.
- Patron hangi kurumdan gönderileceğini seçer.
- Gönder dediğinde:
  1. Gönderen kurum deposundan stok düşer.
  2. İsteyen kurum deposuna stok eklenir.
  3. Transfer hareket kaydı oluşur.

Eklenenler:
- /interfacility-requests sayfası
- interfacility_stock_requests tablosu
- interfacility_stock_movements tablosu
- RLS yetkileri
- Menü linki

Kurulum:
1. ZIP'i aç.
2. app, components ve supabase klasörlerini GitHub ana dizinine yükle.
3. Aynı dosyalar varsa üzerine yaz.
4. Commit changes yap.
5. Supabase SQL Editor'da supabase/schema_v37_interfacility_stock_requests.sql çalıştır.
6. Vercel deploy Ready olunca test et.

Not:
Ürün eşleşmesi depot_items.name alanına göre yapılır. Ürün adı depoda birebir aynı yazılmalı.
