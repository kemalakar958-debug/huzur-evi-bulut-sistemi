import Link from 'next/link';

export default function MobileBar() {
  return (
    <div className="mobileBar">
      <Link href="/dashboard">🏠 Ana</Link>
      <Link href="/mar">✅ MAR</Link>
      <Link href="/vitals">🩺 Vital</Link>
      <Link href="/daily-care">🛏️ Bakım</Link>
      <Link href="/tasks">📌 Görev</Link>
    </div>
  );
}
