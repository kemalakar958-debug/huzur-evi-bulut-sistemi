'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  children: React.ReactNode;
  title?: string;
};

export default function FounderGuard({ children, title = 'Kurucu Yetkisi Gerekli' }: Props) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    checkRole();
  }, []);

  async function checkRole() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    const userRole = profile?.role || null;
    setRole(userRole);
    setAllowed(userRole === 'founder');
    setLoading(false);
  }

  if (loading) {
    return <div className="notice">Kurucu yetkisi kontrol ediliyor...</div>;
  }

  if (!allowed) {
    return (
      <div className="panel">
        <h2>{title}</h2>
        <p>Bu panel sadece <b>founder / kurucu</b> rolündeki kullanıcılar içindir.</p>
        <div className="notice">Mevcut rol: <b>{role || 'tanımsız'}</b></div>
      </div>
    );
  }

  return <>{children}</>;
}
