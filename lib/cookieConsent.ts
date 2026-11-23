/** Consentement propre à cet appareil ; aucun identifiant de visiteur. */
export const CONSENT_KEY = 'lp-audience-consent-v1';
export const CONSENT_DURATION = 180 * 24 * 60 * 60 * 1000;
export type AudienceConsent = { version: 1; analytics: boolean; savedAt: number; expiresAt: number };

export function createConsent(analytics: boolean, now = Date.now()): AudienceConsent {
  return { version: 1, analytics, savedAt: now, expiresAt: now + CONSENT_DURATION };
}

export function parseConsent(raw: string | null, now = Date.now()): AudienceConsent | null {
  try {
    const value = JSON.parse(raw || 'null');
    if (!value || value.version !== 1 || typeof value.analytics !== 'boolean' ||
      !Number.isSafeInteger(value.savedAt) || !Number.isSafeInteger(value.expiresAt) ||
      value.savedAt < 0 || value.savedAt > now || value.expiresAt <= now ||
      value.expiresAt !== value.savedAt + CONSENT_DURATION) return null;
    return { version: 1, analytics: value.analytics, savedAt: value.savedAt, expiresAt: value.expiresAt };
  } catch { return null; }
}

export function hasAudienceConsent(consent: AudienceConsent | null, now = Date.now()): boolean {
  return parseConsent(JSON.stringify(consent), now)?.analytics === true;
}

/** Pas de mesure sur les outils internes, liens de signature ou routes inconnues. */
export function isAudiencePage(pathname: string): boolean {
  return /^\/(?:$|(?:vendre|contact|qui-suis-je|faq|references|partenaires|financement|cookies|confidentialite|mentions-legales|bareme-honoraires)\/?$|(?:immobilier|programmes|actualites|secteurs|defiscalisation|guides)(?:\/|$))/.test(pathname);
}

/** Effacement limité aux cookies GA, sans toucher aux sessions ni préférences. */
export function analyticsCookieDeletions(cookie: string, hostname: string, pathname: string): string[] {
  const names = cookie.split(';').map(v => v.trim().split('=')[0]).filter(v => /^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(v));
  const parts = hostname.split('.');
  const domains = ['', ...parts.map((_, i) => parts.slice(i).join('.')).filter(v => v.includes('.')).map(v => `; Domain=${v}`)];
  const segments = pathname.split('/').filter(Boolean);
  const paths = new Set(['/']);
  for (let i = 1; i <= segments.length; i++) {
    paths.add('/' + segments.slice(0, i).join('/'));
    paths.add('/' + segments.slice(0, i).join('/') + '/');
  }
  return names.flatMap(name => domains.flatMap(domain => [...paths].map(path =>
    `${name}=; Max-Age=0; Path=${path}${domain}; SameSite=Lax`)));
}
