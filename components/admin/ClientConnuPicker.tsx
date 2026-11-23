"use client";
import { useEffect, useId, useState } from 'react';
import { champsClient, type ClientConnu, type SuggestionClient } from '@/lib/clientsConnus';

type NameInput = { value: string; onChange: (value: string) => void; className?: string; testId?: string };
export default function ClientConnuPicker({ current, onSelect, nameInput }: { current: Partial<ClientConnu>; onSelect: (client: ClientConnu) => void; nameInput?: NameInput }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SuggestionClient[]>([]);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const inline = !!nameInput;
  useEffect(() => {
    setResults([]);
    if (query.trim().length < 2) { setStatus(''); return; }
    const controller = new AbortController();
    setStatus('Recherche…');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients-connus?q=${encodeURIComponent(query)}`, { cache: 'no-store', signal: controller.signal });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (controller.signal.aborted) return;
        const contacts = inline ? data.contacts.filter((entry: SuggestionClient) => entry.client.type === 'INDIVIDUAL') : data.contacts;
        setResults(contacts);
        setStatus(contacts.length ? 'Clients connus : choisissez une fiche pour préremplir les coordonnées.' : 'Aucun client trouvé. Vous pouvez poursuivre la saisie manuelle.');
      } catch { if (!controller.signal.aborted) setStatus('Recherche indisponible. Réessayez ou poursuivez la saisie manuelle.'); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, inline]);
  return <div className={inline ? 'text-xs' : 'mb-3 rounded border p-2 bg-gray-50 text-xs'} onBlur={e => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
  }} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); e.stopPropagation(); } }}>
    <label htmlFor={id} className={inline ? 'sr-only' : 'block font-medium mb-1'}>{inline ? 'Nom du client' : 'Client connu : reprendre ses informations'}</label>
    <input id={id} type={inline ? 'text' : 'search'} autoComplete="off" value={nameInput ? nameInput.value : query} onChange={e => {
      setResults([]); setQuery(e.target.value); setOpen(true); nameInput?.onChange(e.target.value);
    }} onFocus={() => { if (query) setOpen(true); }} aria-controls={`${id}-suggestions`} aria-describedby={`${id}-status`} placeholder={inline ? 'Nom' : 'Nom, société, email ou téléphone (2 caractères minimum)'} className={nameInput?.className || 'w-full border rounded p-2'} data-testid={nameInput?.testId} />
    <p id={`${id}-status`} role="status" className="mt-1">{open ? status : ''}</p>
    <ul id={`${id}-suggestions`} hidden={!open} className="max-h-48 overflow-y-auto">
      {results.map(({ client, source }, index) => <li key={index}>
        <button type="button" className="w-full text-left p-2 border-b hover:bg-white focus-visible:outline focus-visible:outline-2" onClick={() => {
          if (champsClient.some(key => (!inline || key !== 'lastName') && current[key]?.trim() && current[key] !== client[key]) && !window.confirm('Remplacer les informations de ce mandant par la fiche sélectionnée ? Les autres mandants et le bien restent inchangés.')) return;
          onSelect(client);
          setQuery(''); setResults([]); setOpen(false);
        }}>
          <span className="block font-semibold">{client.type === 'COMPANY' ? client.name : [client.firstName, client.lastName].filter(Boolean).join(' ')}</span>
          <span className="block">{[client.email, client.phone, client.address].filter(Boolean).join(' · ')}</span>
          <span className="block text-gray-600">{source}</span>
        </button>
      </li>)}
    </ul>
  </div>;
}
