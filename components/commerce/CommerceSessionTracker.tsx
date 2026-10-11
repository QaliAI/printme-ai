'use client';
import { useEffect } from 'react';
import { trackCommerceEvent } from '@/lib/commerce/analytics-events';

export function CommerceSessionTracker() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem('printme:session-started')) return;
      trackCommerceEvent('session_started');
      window.sessionStorage.setItem('printme:session-started', '1');
    } catch { /* Commerce remains usable without session storage. */ }
  }, []);
  return null;
}
