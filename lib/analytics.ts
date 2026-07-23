// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// DEPRECATED: Google Analytics is now loaded via Next.js Script component with strategy="lazyOnload" in app/layout.tsx
// This function is no longer used and can be safely removed in future cleanup

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url
  });
};

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Track page visit to our own backend for simple analytics
export const trackVisit = async (page: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    await fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page,
        referrer: document.referrer || '',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
      })
    });
  } catch (error) {
    // Silently fail - analytics shouldn't break the app
    console.debug('Analytics tracking failed:', error);
  }
};
