'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { CONSENT_KEY, createConsent, isAudiencePage, parseConsent } from '@/lib/cookieConsent';
import type { AudienceConsent } from '@/lib/cookieConsent';
import { setAnalyticsConsent } from '@/lib/analytics';

const ConsentContext = createContext({ openPreferences: () => {}, noticeVisible: false });
export const useAudiencePreferences = () => useContext(ConsentContext);

export function AudiencePreferencesButton() {
  const { openPreferences } = useAudiencePreferences();
  return <button type="button" onClick={openPreferences} className="min-h-11 underline underline-offset-4 text-luxe">Gérer les cookies</button>;
}

export function AnalyticsProvider({ children, measurementId }: { children: React.ReactNode; measurementId: string }) {
  const pathname = usePathname();
  const [choice, setChoice] = useState<AudienceConsent | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const read = () => {
      let stored: AudienceConsent | null = null;
      try { stored = parseConsent(localStorage.getItem(CONSENT_KEY)); } catch { /* refus par défaut */ }
      setChoice(stored);
      setAnalyticsConsent(stored, measurementId);
      setReady(true);
    };
    read();
    const sync = (event: StorageEvent) => { if (event.key === CONSENT_KEY || event.key === null) read(); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [measurementId]);

  useEffect(() => {
    if (!ready) return;
    setAnalyticsConsent(choice, measurementId);
    if (!choice) return;
    let timer: number;
    const expire = () => {
      if (!parseConsent(JSON.stringify(choice))) { setAnalyticsConsent(null, measurementId); setChoice(null); }
      else timer = window.setTimeout(expire, Math.min(choice.expiresAt - Date.now(), 2_147_483_647));
    };
    expire();
    const onVisible = () => { clearTimeout(timer); expire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [choice, measurementId, pathname, ready]);

  useEffect(() => {
    if (preferences && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [preferences]);

  function closePreferences() { dialog.current?.close(); setPreferences(false); }
  function choose(analytics: boolean) {
    const next = createConsent(analytics);
    // Retrait immédiat, avant la mise à jour React.
    setAnalyticsConsent(next, measurementId);
    setChoice(next);
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(next)); setStorageError(false); }
    catch { setStorageError(true); }
    closePreferences();
  }
  const noticeVisible = ready && !choice && isAudiencePage(pathname);
  const explanation = <p className="text-sm leading-relaxed">Avec votre accord, Google Analytics mesure les visites et les demandes de contact pour améliorer le site. Refuser ne change rien à l’accès aux annonces et aux formulaires. Votre choix est conservé sur cet appareil pendant 180 jours. <Link href="/cookies" className="underline underline-offset-2" onClick={closePreferences}>En savoir plus</Link>.</p>;
  const actions = <div className="flex flex-wrap gap-3 mt-4">
    <button type="button" className="consent-choice" onClick={() => choose(false)}>Refuser</button>
    <button type="button" className="consent-choice" onClick={() => choose(true)}>Accepter</button>
  </div>;

  return <ConsentContext.Provider value={{ openPreferences: () => setPreferences(true), noticeVisible: noticeVisible || preferences }}>
    {children}
    {noticeVisible && <section aria-labelledby="audience-title" className="consent-notice">
      <h2 id="audience-title" className="luxe text-xl mb-2">Votre choix pour la mesure d’audience</h2>
      {explanation}{actions}
    </section>}
    <dialog ref={dialog} className="consent-dialog" aria-labelledby="preferences-title" onCancel={() => setPreferences(false)} onClose={() => setPreferences(false)} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const items = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <h2 id="preferences-title" className="luxe text-2xl mb-3">Gérer les cookies</h2>
      {explanation}
      <p className="mt-3 text-sm font-medium">Mesure d’audience : {choice?.analytics ? 'acceptée' : 'non acceptée'}.</p>
      <p className="mt-2 text-sm">Les cookies de session nécessaires aux outils sécurisés ne dépendent pas de ce choix. Vous pouvez revenir ici à tout moment depuis le pied de page.</p>
      {actions}
      <button type="button" className="mt-4 min-h-11 underline text-sm" onClick={closePreferences}>Fermer sans modifier mon choix</button>
    </dialog>
    {storageError && <p role="status" className="fixed bottom-4 left-4 right-4 z-[90] rounded bg-white border border-luxe p-4 text-sm">Votre choix s’applique à cette page, mais ce navigateur ne permet pas de le mémoriser. <button type="button" className="underline min-h-11" onClick={() => setStorageError(false)}>Fermer</button></p>}
  </ConsentContext.Provider>;
}
