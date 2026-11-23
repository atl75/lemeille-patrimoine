/** Une référence issue d'une URL reste une saisie visiteur, pas une preuve de disponibilité. */
export function referenceBien(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : '';
}

export function contactBien(p: { id?: unknown; status?: unknown; sold?: unknown }) {
  const ref = referenceBien(p.id);
  const vendu = p.sold === true || p.status === 'SOLD';
  const statut = vendu ? 'Vendu' : p.status === 'UNDER_OFFER' ? 'Sous promesse'
    : p.status === 'OFFER_RECEIVED' ? 'Sous offre' : '';
  const label = vendu || p.status === 'UNDER_OFFER' ? 'Parler de ma recherche'
    : p.status === 'OFFER_RECEIVED' ? 'Vérifier la disponibilité'
    : p.status == null || p.status === '' || p.status === 'AVAILABLE' ? 'Demander une visite'
    : 'Me renseigner sur ce bien';
  const params = new URLSearchParams({ topic: 'Acheter' });
  if (ref) params.set('ref', ref);
  return { label, href: `/contact?${params}#form`, statut };
}

/** Le préfixe visible dans le formulaire suit le message jusque dans le CRM et l'email. */
export function contexteBien(ref: unknown): string {
  const id = referenceBien(ref);
  return id ? `Bien concerné : ${id}\n\n` : '';
}

export function messageAvecBien(message: string, ref: unknown): string {
  return contexteBien(ref) + message;
}
