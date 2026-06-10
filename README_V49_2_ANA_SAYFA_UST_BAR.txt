v49.2 Ana Sayfa + Üst Kullanıcı Kartı Düzeltme

Bu paket:
- Ana Sayfa menünün en üstüne alır
- / sayfasını /dashboard'a yönlendirir
- Dashboard'u sade ve geniş panelli yapar
- Üst kullanıcı/k kurum kartını daha düzgün hale getirir
- CSS import hatası vermemek için CSS'i ayrı dosya olarak import ettirmez

Kurulum:
1. ZIP'i aç.
2. app ve components klasörlerini GitHub ana dizinine yükle.
3. Aynı dosyalar varsa üzerine yaz.
4. GLOBAL_CSS_EKLE.txt içindeki CSS'i app/globals.css dosyasının EN ALTINA yapıştır.
5. globals.css içinde şu satır varsa SİL:
   @import '../components/v49_1_dashboard_styles.css';
6. Commit yap.
7. Vercel deploy etsin.

SQL gerekmez.
