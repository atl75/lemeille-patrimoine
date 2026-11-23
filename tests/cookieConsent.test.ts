import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSENT_DURATION, createConsent, parseConsent, hasAudienceConsent, isAudiencePage, analyticsCookieDeletions } from '../lib/cookieConsent.ts';
import { setAnalyticsConsent, trackEvent } from '../lib/analytics.ts';

const now = Date.parse('2026-09-11T08:00:00Z');
describe('consentement audience : validation fermée par défaut', () => {
  test('acceptation et refus ont exactement la même durée', () => {
    for (const value of [true, false]) {
      const consent = createConsent(value, now);
      assert.equal(consent.expiresAt, now + CONSENT_DURATION);
      assert.deepEqual(parseConsent(JSON.stringify(consent), now), consent);
      assert.equal(hasAudienceConsent(consent, now), value);
    }
  });
  test('absent, corrompu ou non booléen ne vaut pas accord', () => {
    for (const raw of [null, '', '{', 'true', '[]', '{}', 'null', JSON.stringify({ ...createConsent(true, now), analytics: 'true' })]) {
      assert.equal(parseConsent(raw, now), null);
    }
  });
  test('accord expiré refusé à la milliseconde de fin', () => {
    const consent = createConsent(true, now);
    assert.equal(hasAudienceConsent(consent, consent.expiresAt - 1), true);
    assert.equal(hasAudienceConsent(consent, consent.expiresAt), false);
  });
  test('version, date future, durée prolongée ou nombre invalide refusés', () => {
    for (const patch of [{ version: 2 }, { savedAt: now + 1 }, { savedAt: -1 },
      { expiresAt: now + CONSENT_DURATION + 1 }, { expiresAt: 'demain' }, { expiresAt: Infinity }]) {
      assert.equal(parseConsent(JSON.stringify({ ...createConsent(true, now), ...patch }), now), null);
    }
  });
  test('pages publiques reconnues', () => {
    for (const path of ['/', '/contact', '/vendre/', '/immobilier/estimation', '/immobilier/biens/brkb5kdix', '/actualites/marche', '/cookies']) {
      assert.equal(isAudiencePage(path), true, path);
    }
  });
  test('outils, signatures et routes inconnues exclus', () => {
    for (const path of ['/admin', '/admin/kpi', '/terrain', '/mandat/signer/token', '/offre/signer/token', '/api/leads', '/debug-immobilier', '/contact-prive', '/inconnu']) {
      assert.equal(isAudiencePage(path), false, path);
    }
  });
  test('nettoyage GA sans toucher aux cookies de session', () => {
    const deletions = analyticsCookieDeletions('_ga=abc; session=prive; _ga_TEST=xyz; preference=oui', 'www.lemeillepatrimoine.com', '/immobilier/estimation');
    assert.ok(deletions.length > 0);
    assert.ok(deletions.every(v => v.startsWith('_ga') && v.includes('Max-Age=0')));
    assert.ok(deletions.some(v => v.includes('Domain=lemeillepatrimoine.com')));
    assert.ok(deletions.some(v => v.includes('Path=/immobilier/estimation;')));
    assert.ok(deletions.some(v => !v.includes('Domain=')));
    assert.ok(!deletions.some(v => v.includes('Domain=com;')));
    assert.deepEqual(analyticsCookieDeletions('session=prive', 'localhost', '/'), []);
  });
});

test('cycle Analytics dans un navigateur simulé, sans connexion externe', async t => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const scripts: Array<{ id: string; src: string; onload: () => void; onerror: () => void; remove: () => void }> = [];
  const deleted: string[] = [];
  const fakeWindow = {
    location: { origin: 'https://exemple.test', hostname: 'exemple.test', pathname: '/contact', search: '?email=prive@example.com', hash: '#prive' },
    dataLayer: [] as IArguments[],
  } as unknown as Window;
  const fakeDocument = {
    get cookie() { return '_ga=ancien; session=ne-pas-effacer'; },
    set cookie(value: string) { deleted.push(value); },
    createElement() { return { remove() {} }; },
    head: { appendChild(script: typeof scripts[number]) { scripts.push(script); } },
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: fakeDocument });
  const commands = () => fakeWindow.dataLayer.map(value => Array.from(value as IArguments));
  try {
    await t.test('aucun script ni événement avant consentement ou après refus', () => {
      setAnalyticsConsent(null, 'G-TESTONLY');
      trackEvent('generate_lead', 'contact');
      setAnalyticsConsent(createConsent(false), 'G-TESTONLY');
      assert.equal(scripts.length, 0);
      assert.equal(fakeWindow.dataLayer.length, 0);
      assert.equal(fakeWindow['ga-disable-G-TESTONLY'], true);
      assert.ok(deleted.length > 0);
    });
    await t.test('accord : un seul chargement, puis retrait avant sa fin', () => {
      setAnalyticsConsent(createConsent(true), 'G-TESTONLY');
      setAnalyticsConsent(createConsent(true), 'G-TESTONLY');
      assert.equal(scripts.length, 1);
      assert.equal(scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-TESTONLY');
      setAnalyticsConsent(createConsent(false), 'G-TESTONLY');
      scripts[0].onload();
      assert.equal(fakeWindow.dataLayer.length, 0);
      assert.equal(fakeWindow['ga-disable-G-TESTONLY'], true);
    });
    await t.test('nouvel accord : configuration une seule fois, sans query ni hash', () => {
      setAnalyticsConsent(createConsent(true), 'G-TESTONLY');
      setAnalyticsConsent(createConsent(true), 'G-TESTONLY');
      assert.equal(scripts.length, 1);
      const config = commands().filter(v => v[0] === 'config');
      assert.equal(config.length, 1);
      assert.deepEqual(config[0][2], {
        allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_expires: 180 * 24 * 60 * 60, cookie_update: false,
        page_location: 'https://exemple.test/contact', page_referrer: '',
      });
    });
    await t.test('seules les conversions prévues sont transmises, sans valeur ni libellé libre', () => {
      const before = fakeWindow.dataLayer.length;
      trackEvent('generate_lead', 'contact');
      trackEvent('email_prive', 'contact');
      trackEvent('generate_lead', 'prive@example.com');
      assert.equal(fakeWindow.dataLayer.length, before + 1);
      assert.deepEqual(commands().at(-1), ['event', 'generate_lead', {
        event_category: 'contact', page_location: 'https://exemple.test/contact', page_referrer: '',
      }]);
    });
    await t.test('retrait après chargement : désactivation GA et plus aucun événement métier', () => {
      const before = fakeWindow.dataLayer.length;
      setAnalyticsConsent(createConsent(false), 'G-TESTONLY');
      trackEvent('generate_lead', 'contact');
      assert.equal(fakeWindow['ga-disable-G-TESTONLY'], true);
      assert.equal(fakeWindow.dataLayer.length, before);
    });
    await t.test('expiration et page privée refusées malgré une acceptation antérieure', () => {
      setAnalyticsConsent(createConsent(true, Date.now() - CONSENT_DURATION), 'G-TESTONLY');
      assert.equal(fakeWindow['ga-disable-G-TESTONLY'], true);
      fakeWindow.location.pathname = '/mandat/signer/prive';
      setAnalyticsConsent(createConsent(true), 'G-TESTONLY');
      const before = fakeWindow.dataLayer.length;
      trackEvent('generate_lead', 'contact');
      assert.equal(fakeWindow['ga-disable-G-TESTONLY'], true);
      assert.equal(fakeWindow.dataLayer.length, before);
    });
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument); else Reflect.deleteProperty(globalThis, 'document');
  }
});
