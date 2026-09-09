'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Un champ numérique qui SE LIT : « 745 000 » et non « 745000 ».
 *
 * Pourquoi pas un simple `type="number"` : le navigateur y refuse tout
 * séparateur de milliers. Or un prix à six chiffres sans respiration se
 * vérifie mal, et une erreur d'un facteur dix se voit trop tard — dans un
 * document déjà posé devant le vendeur.
 *
 * LE PIÈGE EST LE CURSEUR. Reformater à chaque frappe réécrit la valeur, et le
 * curseur saute en fin de champ : corriger le deuxième chiffre d'un prix
 * devient impossible. On compte donc les CHIFFRES situés avant le curseur, et
 * on le repose après le même nombre de chiffres une fois la valeur reformatée.
 *
 * CONTRAT AVEC LE PARENT : `value` et `onChange` parlent en forme canonique —
 * « 745000 », « 56.59 » — celle que Number() sait lire. Le formatage ne vit
 * que dans l'affichage.
 */
export default function ChampNombre({
  value, onChange, decimales = false, className, placeholder, testid, title,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Autoriser une partie décimale — utile pour une surface, pas pour un prix. */
  decimales?: boolean;
  className?: string;
  placeholder?: string;
  testid?: string;
  title?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  const afficher = (canonique: string): string => {
    if (!canonique) return '';
    const [entier, dec] = canonique.split('.');
    const n = entier.replace(/\D/g, '');
    const groupe = n ? Number(n).toLocaleString('fr-FR') : '';
    // La virgule reste visible tant que l'utilisateur tape « 56, » : la retirer
    // l'empêcherait d'écrire la décimale.
    return dec === undefined ? groupe : `${groupe},${dec}`;
  };

  const canoniser = (saisi: string): string => {
    const virgule = decimales ? saisi.search(/[.,]/) : -1;
    if (virgule === -1) return saisi.replace(/\D/g, '');
    const entier = saisi.slice(0, virgule).replace(/\D/g, '');
    const dec = saisi.slice(virgule + 1).replace(/\D/g, '').slice(0, 2);
    return `${entier}.${dec}`;
  };

  const affiche = afficher(value);

  // Repose le curseur après le même nombre de chiffres qu'avant la frappe.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || caret.current === null) return;
    const vises = caret.current;
    caret.current = null;
    let vus = 0, pos = 0;
    for (; pos < el.value.length && vus < vises; pos++) {
      if (/[\d,]/.test(el.value[pos])) vus++;
    }
    el.setSelectionRange(pos, pos);
  }, [affiche]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode={decimales ? 'decimal' : 'numeric'}
      className={className}
      placeholder={placeholder}
      title={title}
      data-testid={testid}
      value={affiche}
      onChange={e => {
        const el = e.target;
        const avant = el.value.slice(0, el.selectionStart ?? 0);
        caret.current = (avant.match(/[\d,]/g) ?? []).length;
        onChange(canoniser(el.value));
      }}
    />
  );
}
