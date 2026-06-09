'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type ActiveFacilityContext = {
  role: string;
  userFacilityId: string | null;
  activeFacilityId: string;
  isGeneral: boolean;
};

export function getStoredActiveFacilityId() {
  if (typeof window === 'undefined') return 'general';
  return localStorage.getItem('activeFacilityId') || 'general';
}

export function setStoredActiveFacilityId(value: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('activeFacilityId', value);
  window.dispatchEvent(new Event('activeFacilityChanged'));
}

export function useActiveFacility() {
  const [context, setContext] = useState<ActiveFacilityContext>({
    role: 'viewer',
    userFacilityId: null,
    activeFacilityId: 'general',
    isGeneral: true,
  });

  useEffect(() => {
    load();

    function onChange() {
      load();
    }

    window.addEventListener('activeFacilityChanged', onChange);
    window.addEventListener('storage', onChange);

    return () => {
      window.removeEventListener('activeFacilityChanged', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', userId)
      .maybeSingle();

    const role = profile?.role || 'viewer';
    const userFacilityId = profile?.facility_id || null;

    let activeFacilityId = getStoredActiveFacilityId();

    if (role !== 'founder') {
      activeFacilityId = userFacilityId || 'general';
      setStoredActiveFacilityId(activeFacilityId);
    }

    setContext({
      role,
      userFacilityId,
      activeFacilityId,
      isGeneral: role === 'founder' && activeFacilityId === 'general',
    });
  }

  return context;
}

export function applyActiveFacilityFilter(query: any, ctx: ActiveFacilityContext) {
  if (ctx.role === 'founder') {
    if (ctx.activeFacilityId === 'general') return query;
    return query.eq('facility_id', ctx.activeFacilityId);
  }

  if (ctx.userFacilityId) {
    return query.eq('facility_id', ctx.userFacilityId);
  }

  return query;
}

export function activeFacilityLabel(ctx: ActiveFacilityContext) {
  if (ctx.role === 'founder' && ctx.activeFacilityId === 'general') return 'Genel Kontrol';
  return ctx.activeFacilityId;
}
