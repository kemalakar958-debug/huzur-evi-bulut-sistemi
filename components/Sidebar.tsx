import Link from 'next/link';

const groups = [
  { title: 'Ana Sistem', items: [['Ana Panel', '/dashboard', '🏠'], ['Hasta Listesi', '/patients', '👥'], ['İlaçlar', '/medications', '💊'], ['Tedavi Sistemi', '/treatments', '🧪']] },
  { title: 'Klinik Operasyon', items: [['Vital Takip', '/vitals', '🩺'], ['Olay / Düşme', '/incidents', '⚠️'], ['Hastane Sevk', '/transfers', '🚑'], ['Görev Takip', '/tasks', '📌'], ['Nöbet Teslim', '/shift-handover', '📘']] },
  { title: 'Bakım Modülleri', items: [['Bakım Planı', '/care-plans', '🧾'], ['Günlük Bakım', '/daily-care', '🛏️'], ['Beslenme / Sıvı', '/nutrition', '🍽️'], ['Bası / Pansuman', '/wound-care', '🩹'], ['Randevular', '/appointments', '📅']] },
  { title: 'Yaşlı Bakım Operasyon', items: [['Aktivite Takibi', '/activities', '🎲'], ['Fizik Tedavi', '/physio', '🚶'], ['Uyku Takibi', '/sleep', '🌙'], ['Davranış Takibi', '/behavior', '🧠'], ['Ziyaretçi Takibi', '/visitors', '👪'], ['Oda / Yatak', '/rooms', '🛏️'], ['Risk Skorları', '/risk-scores', '📊']] },
  { title: 'Depo ve Evrak', items: [['Evrak Merkezi', '/documents', '📁'], ['Revir Deposu', '/depot', '🏬'], ['İş Akışı', '/workflow', '🔄'], ['Acil Durum', '/emergency', '🚨']] },
  { title: 'Yönetim', items: [['Kullanıcılar', '/users', '🔐']] },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logoIcon">🏥</div>
        <div><h1>İlgi Klinik Bulut</h1><span>v33 yaşlı bakım operasyon</span></div>
      </div>
      {groups.map((group) => (
        <div key={group.title}>
          <div className="navTitle">{group.title}</div>
          {group.items.map(([label, href, icon]) => (
            <Link className="navBtn" href={href} key={href}>
              <span>{icon}</span><span>{label}</span>
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}
