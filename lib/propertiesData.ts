import { readJSON } from '@/lib/utils';
import { toPublicPropertyCard } from '@/lib/publicProperty';

// Accès direct (serveur) aux biens pour les LISTES publiques, sans self-fetch
// HTTP : lecture du fichier + filtre « visible » + projection carte légère.
// Permet une génération statique/ISR propre (le fetch no-store forçait le
// rendu dynamique et rechargeait tout à chaque visite).
export async function getPropertyCards() {
  const data = await readJSON('properties.json');
  return (Array.isArray(data) ? data : [])
    .filter((p: any) => p && p.visible !== false)
    .map(toPublicPropertyCard);
}
