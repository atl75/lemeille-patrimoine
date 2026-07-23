'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView, trackVisit } from '@/lib/analytics';

export const useAnalytics = () => {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string>(pathname);
  const entryTimeRef = useRef<number>(Date.now());
  
  useEffect(() => {
    if (pathname !== prevPathnameRef.current) {
      // Track with Google Analytics
      trackPageView(pathname);
      
      // Track with our own backend for dashboard stats
      trackVisit(pathname);
      
      // Update refs
      prevPathnameRef.current = pathname;
      entryTimeRef.current = Date.now();
    }
  }, [pathname]);
};
