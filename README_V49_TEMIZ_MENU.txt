v49 Temiz Menü / Eski Ekranları Gizleme

Bu paket SQL gerektirmez.
Veri silmez.
Sayfa dosyalarını silmez.
Sadece sol menüyü sadeleştirir.

Menüden kaldırılan eski/fazla ekranlar:
- /management eski yönetim paneli
- /users eski kullanıcı ekranı
- /transfers eski hastane sevk ekranı
- /activities
- /physio
- /sleep
- /behavior
- /risk-scores
- /workflow
- /emergency

Menüde kalan ana ekranlar:
- /founder-dashboard
- /facilities
- /user-admin
- /role-settings
- /system-settings
- /patients
- /admissions
- /visitors
- /vitals
- /treatments
- /medications
- /daily-care
- /nutrition
- /wound-care
- /incidents
- /hospital-cases
- /appointments
- /depot
- /interfacility-requests
- /documents
- /belongings
- /tasks
- /shift-handover

Kurulum:
1. ZIP'i aç.
2. İçindeki components klasörünü GitHub ana dizinine yükle.
3. components/Sidebar.tsx dosyası varsa üzerine yaz.
4. Commit changes yap.
5. Vercel deploy Ready olunca siteyi yenile.

Not:
Gizlenen eski sayfalar URL ile açılabilir durumda kalır.
Tam silme işlemini sonraki aşamada, sistemin stabil olduğundan emin olunca yapmalıyız.
