/** Validation de forme uniquement : aucune valeur de marché ni donnée manquante n'est inventée. */
export function nombreFini(v: unknown): boolean {
  return (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v));
}

export function dateCivileValide(v: unknown): boolean {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function erreurComparables(cs: unknown): string | null {
  if (!Array.isArray(cs) || cs.length > 40) return 'Comparables invalides (40 maximum).';
  const ids = new Set<string>();
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    const erreur = (message: string) => `Comparable ${i + 1} : ${message}`;
    if (!c || typeof c !== 'object' || Array.isArray(c)) return erreur('objet attendu.');
    if (typeof c.id !== 'string' || !c.id.trim() || c.id.length > 200) return erreur('identifiant invalide.');
    if (ids.has(c.id)) return erreur('identifiant déjà utilisé ; vérifier les doublons sans supprimer arbitrairement une référence.');
    ids.add(c.id);
    for (const k of ['prix', 'surface']) {
      if (!nombreFini(c[k]) || Number(c[k]) <= 0) return erreur(`${k} doit être un nombre positif fini.`);
    }
    if (c.prixVente != null && (!nombreFini(c.prixVente) || Number(c.prixVente) <= 0)) return erreur('prix de vente invalide.');
    for (const k of ['titre', 'ville', 'source', 'note', 'etage', 'lien']) {
      if (c[k] != null && (typeof c[k] !== 'string' || c[k].length > 4000)) return erreur(`${k} : texte attendu (4 000 caractères maximum).`);
    }
    if (c.statut != null && !['EN_VENTE', 'VENDU'].includes(c.statut)) return erreur('statut inconnu.');
    if (c.dpe != null && !['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'NS', 'VIERGE'].includes(c.dpe)) return erreur('classe DPE inconnue ; vérifier la source.');
    if (c.dateParution != null && c.dateParution !== '' && !dateCivileValide(c.dateParution)) return erreur('date de parution invalide (AAAA-MM-JJ).');
    if (c.lien) {
      try {
        const u = new URL(c.lien);
        if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return erreur('lien HTTP(S) sans identifiants attendu.');
      } catch { return erreur('lien HTTP(S) complet attendu.'); }
    }
  }
  return null;
}

export function erreurReference(r: any): string | null {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return 'Référence : objet attendu.';
  for (const k of ['m2', 'bas', 'haut']) {
    if (r[k] != null && r[k] !== '' && (!nombreFini(r[k]) || Number(r[k]) <= 0)) return `Référence : ${k} doit être un nombre positif fini.`;
  }
  if (nombreFini(r.bas) && nombreFini(r.haut) && Number(r.bas) > Number(r.haut)) return 'Référence : la borne basse dépasse la borne haute.';
  if (r.source != null && (typeof r.source !== 'string' || r.source.length > 4000)) return 'Référence : source textuelle attendue (4 000 caractères maximum).';
  return null;
}
