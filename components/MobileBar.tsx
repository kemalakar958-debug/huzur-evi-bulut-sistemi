import Link from 'next/link';

export default function MobileBar() {
  return (
    <div className="mobileBar">
      <Link href="/dashboard">🏠 Ana</Link>
      <Link href="/patients">👥 Hasta</Link>
      <Link href="/vitals">🩺 Vital</Link>
      <Link href="/incidents">⚠️ Olay</Link>
      <Link href="/transfers">🚑 Sevk</Link>
    </div>
  );
}
