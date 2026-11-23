import { createHash } from 'node:crypto';
import { ErreurDemande, type LeadEntrant } from './leadIntake.ts';

function canonique(value: any): any {
  if (Array.isArray(value)) return value.map(canonique);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined)
      .map(key => [key, canonique(value[key])]));
  }
  return value;
}

/** Seulement les champs publics validés : pas d'identifiant, date, statut ni note CRM. */
function empreinte(lead: LeadEntrant): string {
  const champs = ['firstName', 'lastName', 'email', 'phone', 'topic', 'message', 'source', 'consent', 'meta'];
  return createHash('sha256').update(JSON.stringify(canonique(Object.fromEntries(champs.map(key => [key, lead[key]]))))).digest('hex');
}

export async function sauvegarderLeadUnique(
  lead: LeadEntrant,
  modifier: (mutate: (data: LeadEntrant[]) => LeadEntrant[] | symbol) => Promise<unknown>,
  sansEcriture: symbol,
): Promise<{ id: string; cree: boolean }> {
  const signature = lead.idempotencyKey ? empreinte(lead) : undefined;
  const nouveau = signature ? { ...lead, idempotencyFingerprint: signature } : lead;
  let resultat = { id: lead.id, cree: true };
  await modifier(data => {
    // Le callback peut être rejoué par le CAS : toujours repartir de la lecture fraîche.
    resultat = { id: lead.id, cree: true };
    if (lead.idempotencyKey) {
      const existant = data.find(item => item?.idempotencyKey === lead.idempotencyKey);
      if (existant?.id) {
        // Compatibilité des leads des lots 38–39 qui n'ont pas encore d'empreinte.
        if ((existant.idempotencyFingerprint || empreinte(existant)) !== signature) {
          throw new ErreurDemande('Cette demande a changé depuis son premier envoi. Rechargez le formulaire pour envoyer les nouvelles informations, ou contactez Arthur au 06 87 15 72 59.', 409);
        }
        resultat = { id: String(existant.id), cree: false };
        return sansEcriture;
      }
    }
    data.push(nouveau);
    return data;
  });
  return resultat;
}
