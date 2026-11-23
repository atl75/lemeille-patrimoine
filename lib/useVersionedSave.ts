"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

/** Une seule requête en vol ; son accusé ne valide QUE le contenu envoyé. */
export function useVersionedSave({ url, method, payload, enabled, initialRevision = 0 }: {
  url: string; method: 'PATCH' | 'PUT'; payload: object; enabled: boolean; initialRevision?: number;
}) {
  const serialized = JSON.stringify(payload);
  const current = useRef(serialized); current.current = serialized;
  const ack = useRef<string | null>(null);
  const revision = useRef(initialRevision);
  const flight = useRef<Promise<boolean> | null>(null);
  const pending = useRef<{ content: string; expectedRevision: number; requestId: string } | null>(null);
  const [status, setStatus] = useState<'saved'|'dirty'|'saving'|'error'|'conflict'>('saved');
  const [message, setMessage] = useState('');
  const [tick, setTick] = useState(0);
  const activeUrl = useRef(url); activeUrl.current = url;
  useEffect(() => {
    ack.current = null; pending.current = null; flight.current = null;
    setStatus('saved'); setMessage('');
  }, [url]);
  useEffect(() => {
    if (enabled && ack.current === null) { ack.current = serialized; revision.current = initialRevision; setTick(t => t + 1); }
  }, [enabled, serialized, initialRevision]);

  const save = useCallback(async (): Promise<boolean> => {
    if (flight.current) return flight.current;
    if (ack.current === current.current) return true;
    if (status === 'conflict') return false;
    const batch = pending.current ?? { content: current.current, expectedRevision: revision.current, requestId: crypto.randomUUID() };
    pending.current = batch;
    setStatus('saving'); setMessage('');
    const request = (async () => {
      try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...JSON.parse(batch.content), expectedRevision: batch.expectedRevision, requestId: batch.requestId }) });
        const data = await response.json();
        if (activeUrl.current !== url) return false;
        if (!response.ok) {
          if (response.status === 400) pending.current = null;
          setStatus(response.status === 409 ? 'conflict' : 'error');
          setMessage(data.error || 'Sauvegarde impossible. Votre saisie reste sur cette page.');
          return false;
        }
        revision.current = data.revision;
        ack.current = batch.content; pending.current = null;
        setStatus(ack.current === current.current ? 'saved' : 'dirty');
        return true;
      } catch {
        if (activeUrl.current !== url) return false;
        setStatus('error'); setMessage('Connexion interrompue. Votre saisie reste sur cette page ; réessayez.'); return false;
      } finally { if (activeUrl.current === url) { flight.current = null; setTick(t => t + 1); } }
    })();
    flight.current = request;
    return request;
  }, [url, method, status]);

  const dirty = enabled && ack.current !== null && ack.current !== serialized;
  useEffect(() => {
    if (!dirty || status === 'saving' || status === 'error' || status === 'conflict') return;
    setStatus('dirty');
    const timer = setTimeout(() => { void save(); }, 1500);
    return () => clearTimeout(timer);
  }, [serialized, dirty, status, save, tick]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    // Couvre aussi les liens internes Next, pas seulement la fermeture d'onglet.
    const navigate = (event: MouseEvent) => {
      const a = (event.target as Element)?.closest?.('a[href]');
      if (a && !window.confirm('Des modifications ne sont pas enregistrées. Quitter cette page ?')) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', navigate, true); };
  }, [dirty]);
  const flush = async () => {
    if (flight.current && !await flight.current) return false;
    if (!await save()) return false;
    if (ack.current !== current.current && !await save()) return false;
    return ack.current === current.current;
  };
  const exportDraft = () => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([current.current], { type: 'application/json' }));
    link.href = url; link.download = 'brouillon-estimation-prive.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return { status, message, dirty, save, flush, revision, exportDraft };
}
