import { updateJSON } from '@/lib/utils';

// Mémorise les offices notariaux (nom, tél, email, clerc) d'un bien enregistré,
// dans data/notary-contacts.json, pour réinjection automatique ultérieure.
// Le clerc (champ unique du bien) est associé au notaire du VENDEUR.
const norm = (s: string) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

export async function rememberNotaries(p: any): Promise<void> {
  const entries: any[] = [];
  // Chaque notaire porte désormais son propre clerc (clerkName/clerkEmail).
  if (p?.sellerNotary?.officeName) entries.push({ ...p.sellerNotary });
  if (p?.buyerNotary?.officeName) entries.push({ ...p.buyerNotary });
  if (!entries.length) return;

  try {
    await updateJSON('notary-contacts.json', (data: any[]) => {
      const list = Array.isArray(data) ? data : [];
      for (const e of entries) {
        const fields = {
          officeName: (e.officeName || '').toString().trim(),
          notaryName: (e.notaryName || '').toString().trim(),
          address: (e.address || '').toString().trim(),
          city: (e.city || '').toString().trim(),
          postalCode: (e.postalCode || '').toString().trim(),
          phone: (e.phone || '').toString().trim(),
          email: (e.email || '').toString().trim(),
          clerkName: (e.clerkName || '').toString().trim(),
          clerkEmail: (e.clerkEmail || '').toString().trim(),
        };
        const i = list.findIndex((c: any) => norm(c.officeName) === norm(fields.officeName));
        const nonEmpty = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== ''));
        if (i >= 0) list[i] = { ...list[i], ...nonEmpty };
        else list.push({ ...fields });
      }
      return list;
    });
  } catch (e) {
    console.error('Mémorisation des contacts notaires échouée:', e);
  }
}
