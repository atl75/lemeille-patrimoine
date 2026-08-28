import { revalidatePath } from 'next/cache';

// Régénère immédiatement les pages publiques dépendant des biens après une
// création/modification/suppression dans l'admin (les pages sont en ISR 5 min).
export function revalidatePublicProperties() {
  try {
    revalidatePath('/');
    revalidatePath('/immobilier');
    revalidatePath('/references');
    revalidatePath('/secteurs/[slug]', 'page');
    revalidatePath('/immobilier/biens/[id]', 'page');
  } catch { /* no-op hors contexte de requête */ }
}
