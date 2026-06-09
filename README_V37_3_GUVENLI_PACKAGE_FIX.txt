v37.3 Güvenli Package Fix

Amaç:
Vercel'in "Vulnerable version of Next.js detected" uyarısını aşmak için Next.js sürümünü 15.5.9'a sabitler.

Kurulum:
1. ZIP'i aç.
2. İçindeki package.json dosyasını GitHub projesinin ana dizinine yükle.
3. Eski package.json üzerine yaz.
4. GitHub ana dizinde package-lock.json varsa sil.
5. Commit changes yap.
6. Vercel otomatik deploy etsin.
7. Deployments kısmında son deploy Ready olmalı.

Önemli:
- app klasörüne dokunmaz.
- Supabase SQL gerekmez.
- Sadece bağımlılık sürümünü düzeltir.
