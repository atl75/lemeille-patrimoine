"use client";
import type { useVersionedSave } from '@/lib/useVersionedSave';
export default function EtatSauvegarde({ save }: { save: ReturnType<typeof useVersionedSave> }) {
  return <div className="no-print mb-3 rounded-lg border bg-white p-3 text-sm" role="status" aria-live="polite">
    {({ saved: 'Enregistré', dirty: 'Modifications non enregistrées', saving: 'Enregistrement…', error: 'Échec de sauvegarde', conflict: 'Conflit : une autre version a été enregistrée' })[save.status]}
    {save.message && <p>{save.message}</p>}
    {(save.status === 'error' || save.status === 'conflict') && <div className="mt-2 flex flex-wrap gap-3">
      {save.status !== 'conflict' && <button className="underline" onClick={() => void save.save()}>Réessayer</button>}
      <button className="underline" onClick={save.exportDraft}>Télécharger ma saisie (fichier privé)</button>
      <button className="underline" onClick={() => { if (confirm('Recharger abandonne la saisie locale. Téléchargez-la auparavant si nécessaire.')) location.reload(); }}>Recharger la version enregistrée</button>
    </div>}
  </div>;
}
