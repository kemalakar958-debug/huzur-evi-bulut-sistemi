import Link from 'next/link';

const groups = [
  { title: 'Günlük İşler', items: [['Ana Panel', '/dashboard', '🏠'], ['Hasta Listesi', '/patients', '👥'], ['İlaçlar', '/medications', '💊'], ['İş Akışı', '/workflow', '🔄']] },
  { title: 'Klinik Operasyon', items: [['Vital Takip', '/vitals', '🩺'], ['Olay / Düşme', '/incidents', '⚠️'], ['Hastane Sevk', '/transfers', '🚑']] },
  { title: 'Klinik ve Acil', items: [['Acil Durum', '/emergency', '🚨'], ['Evrak Merkezi', '/documents', '📁']] },
  { title: 'Depo ve Yönetim', items: [['Revir Deposu', '/depot', '🏬'], ['Kullanıcılar', '/users', '🔐']] },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logoIcon">🏥</div>
        <div><h1>İlgi Klinik Bulut</h1><span>v29.1 klinik operasyon</span></div>
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
