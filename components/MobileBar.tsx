import Link from 'next/link';

export default function MobileBar() {
  return (
    <div className="mobileBar">
      <Link href="/dashboard">🏠 Ana</Link>
      <Link href="/patients">👥 Hasta</Link>
      <Link href="/medications">💊 İlaç</Link>
      <Link href="/emergency">🚑 Acil</Link>
      <Link href="/workflow">🔄 Akış</Link>
    </div>
  );
}
