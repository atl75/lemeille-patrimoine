/**
 * Ce que le formulaire du bien N'A PAS le droit d'écraser.
 *
 * La route de modification remplaçait la fiche entière par le résultat de la
 * validation : `data[idx] = { id, ...validation.data }`. Or zod supprime tout
 * ce que le schéma ne connaît pas, et l'argumentaire de prix n'y figure pas.
 * Conséquence constatée en usage : modifier un simple champ du bien effaçait
 * les comparables, le prix de référence et les réglages de recherche.
 *
 * Le formulaire du bien gère les champs du bien. Ce qui lui est étranger ne
 * doit pas disparaître parce qu'il l'ignore.
 */

/**
 * Fusionne la fiche existante et les champs validés, en conservant tout ce que
 * le schéma ne gère pas.
 *
 * Les champs CONNUS du schéma gardent exactement leur comportement d'avant —
 * ils sont remplacés, y compris pour être vidés. Seuls les champs étrangers au
 * schéma sont repris de l'ancienne fiche.
 */
export function fusionneBien(
  ancien: Record<string, any> | undefined,
  valide: Record<string, any>,
  clesDuSchema: Iterable<string>,
  id: string,
): Record<string, any> {
  const connues = new Set(clesDuSchema);
  const conserves: Record<string, any> = {};
  for (const [cle, valeur] of Object.entries(ancien ?? {})) {
    if (cle !== 'id' && !connues.has(cle)) conserves[cle] = valeur;
  }
  return { ...conserves, id, ...valide };
}
