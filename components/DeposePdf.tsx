'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Zone de dépôt d'un PDF : on y GLISSE le fichier, ou on clique pour le choisir.
 *
 * POURQUOI UN COMPOSANT. La première version n'offrait qu'un bouton ouvrant le
 * sélecteur de fichiers. Or le geste naturel, quand on vient d'imprimer une
 * page en PDF, est de faire glisser le fichier depuis le Finder : sans cadre
 * pour l'accueillir, il n'y a rien à viser et le glissement ne produit rien.
 *
 * TROIS PIÈGES DU GLISSER-DÉPOSER, tous traités ici :
 *  - sans preventDefault() sur dragOver, le dépôt n'a jamais lieu et le
 *    navigateur OUVRE le PDF à la place, faisant perdre la page en cours ;
 *  - dragEnter et dragLeave se déclenchent aussi au passage sur les enfants de
 *    la zone, ce qui fait clignoter la mise en évidence : d'où le compteur de
 *    profondeur plutôt qu'un simple booléen ;
 *  - un fichier lâché À CÔTÉ de la zone est ouvert par le navigateur, avec la
 *    même perte de page. On neutralise donc le dépôt sur toute la fenêtre.
 */
export default function DeposePdf({
  onFichier, libelle, aide, occupe, testid,
}: {
  onFichier: (f: File) => void;
  libelle: string;
  aide?: string;
  occupe?: boolean;
  testid: string;
}) {
  const [survol, setSurvol] = useState(false);
  const [refus, setRefus] = useState(false);
  const profondeur = useRef(0);
  const champ = useRef<HTMLInputElement>(null);

  // Un fichier lâché hors de la zone ne doit pas emporter la page.
  useEffect(() => {
    const neutralise = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', neutralise);
    window.addEventListener('drop', neutralise);
    return () => {
      window.removeEventListener('dragover', neutralise);
      window.removeEventListener('drop', neutralise);
    };
  }, []);

  const estPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

  const ouvrirSelecteur = () => champ.current?.click();

  return (
    <div
      data-testid={testid}
      role="button"
      tabIndex={0}
      aria-label={libelle}
      onClick={ouvrirSelecteur}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrirSelecteur(); }
      }}
      onDragEnter={e => { e.preventDefault(); profondeur.current += 1; setSurvol(true); setRefus(false); }}
      onDragOver={e => {
        // Indispensable : sans cela le dépôt n'a pas lieu du tout.
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={e => {
        e.preventDefault();
        profondeur.current -= 1;
        if (profondeur.current <= 0) { profondeur.current = 0; setSurvol(false); }
      }}
      onDrop={e => {
        e.preventDefault();
        profondeur.current = 0;
        setSurvol(false);
        const f = Array.from(e.dataTransfer.files ?? []).find(estPdf);
        if (f) { onFichier(f); return; }
        // On le dit, plutôt que de rester muet devant un fichier refusé.
        setRefus(true);
        setTimeout(() => setRefus(false), 4000);
      }}
      className={[
        'block w-full rounded border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors',
        survol
          ? 'border-[#1F3B2C] bg-[#1F3B2C]/[0.06]'
          : 'border-black/15 hover:border-black/30 hover:bg-black/[0.02]',
        occupe ? 'opacity-60 pointer-events-none' : '',
      ].join(' ')}
    >
      <input
        ref={champ}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        data-testid={`${testid}-champ`}
        onChange={e => {
          const f = e.target.files?.[0];
          // On vide la sélection : redéposer le même fichier doit relancer la lecture.
          e.target.value = '';
          if (f) onFichier(f);
        }}
      />
      <div className="text-sm font-medium text-[#1F3B2C]">
        {occupe ? 'Lecture du document…' : survol ? 'Lâchez le fichier ici' : libelle}
      </div>
      {/* Pendant le survol, « Lâchez le fichier ici » se suffit : garder
          l'invite à cliquer en dessous brouillait le geste en cours. */}
      {aide && !occupe && !survol && <div className="text-xs opacity-65 mt-1">{aide}</div>}
      {refus && <div className="text-xs text-red-700 mt-1">Ce fichier n&apos;est pas un PDF.</div>}
    </div>
  );
}
