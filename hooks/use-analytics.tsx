'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

export const useAnalytics = () => {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string>(pathname);
  const entryTimeRef = useRef<number>(Date.now());
  
  useEffect(() => {
    if (pathname !== prevPathnameRef.current) {
      // Suivi Google Analytics uniquement (l'analytics maison a été retiré).
      trackPageView(pathname);

      prevPathnameRef.current = pathname;
      entryTimeRef.current = Date.now();
    }
  }, [pathname]);
};
