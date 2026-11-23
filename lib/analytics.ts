import { analyticsCookieDeletions, hasAudienceConsent, isAudiencePage } from './cookieConsent.ts';
import type { AudienceConsent } from './cookieConsent.ts';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean;
  }
}

let choice: AudienceConsent | null = null;
let measurementId = '';
let scriptStarted = false;
let scriptReady = false;
let configured = false;

function allowed() {
  return typeof window !== 'undefined' && hasAudienceConsent(choice) &&
    isAudiencePage(window.location.pathname) && /^G-[A-Z0-9]+$/.test(measurementId);
}

function configure() {
  if (!allowed() || !scriptReady || configured) return;
  configured = true;
  window.gtag('consent', 'default', {
    analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    allow_google_signals: false, allow_ad_personalization_signals: false,
    cookie_expires: 180 * 24 * 60 * 60, cookie_update: false,
    page_location: window.location.origin + window.location.pathname,
    page_referrer: '',
  });
}

export function setAnalyticsConsent(consent: AudienceConsent | null, id: string) {
  if (typeof window === 'undefined') return;
  choice = consent;
  measurementId = id;
  window[`ga-disable-${id}`] = !allowed();
  if (!allowed()) {
    configured = false;
    for (const deletion of analyticsCookieDeletions(document.cookie, window.location.hostname, window.location.pathname)) {
      document.cookie = deletion;
    }
    return;
  }
  if (!scriptStarted) {
    scriptStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function (..._args: unknown[]) {
      if (allowed()) window.dataLayer.push(arguments);
    };
    const script = document.createElement('script');
    script.id = 'lp-consented-analytics';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.onload = () => { scriptReady = true; configure(); };
    script.onerror = () => { scriptStarted = false; scriptReady = false; script.remove(); };
    document.head.appendChild(script);
  }
  configure();
}

/** Les pages vues restent pilotées par GA, pas par un second suivi manuel SPA.
 * Vérifier les mesures améliorées dans GA avant de changer cette stratégie. */
export function trackEvent(action: string, category?: string) {
  if (!allowed() || !configured || !window.gtag) return;
  const categories = ['contact', 'estimation', 'simulateur', 'capacite-emprunt'];
  if (action !== 'generate_lead' || !category || !categories.includes(category)) return;
  window.gtag('event', action, {
    event_category: category,
    page_location: window.location.origin + window.location.pathname,
    page_referrer: '',
  });
}
