import { z } from 'zod';
import { leadJoignable, tronqueLead } from './validationLead.ts';

const texte = (max: number) => z.string().trim().max(max).optional();
const nombre = z.number().finite();
const propriete = z.object({
  sector: texte(40), type: texte(40), city: texte(500), condition: texte(60), dpe: texte(20),
  surface: z.union([nombre.positive().max(1_000_000), z.literal('')]).optional(),
  rooms: z.union([nombre.nonnegative().max(1000), z.literal('')]).optional(),
  floor: z.union([nombre, z.literal('')]).optional(),
  extBalcon: z.union([nombre.nonnegative(), z.literal('')]).optional(),
  elevator: z.boolean().optional(), extTerrasse: z.boolean().optional(), extJardin: z.boolean().optional(),
  parking: z.boolean().optional(), seaView: z.boolean().optional(), pool: z.boolean().optional(),
  lumineux: z.boolean().optional(), calme: z.boolean().optional(), cuisineEquipee: z.boolean().optional(),
  cuisineRecente: z.boolean().optional(), parquet: z.boolean().optional(), dressing: z.boolean().optional(),
});

// Liste blanche publique ; pièces jointes, actions, notes et statuts sont réservés au CRM.
const schemaPublic = z.object({
  firstName: texte(120), lastName: texte(120), email: texte(200), phone: texte(40),
  topic: texte(200), message: texte(5000),
  source: z.enum(['contact-form', 'estimation-immobilier', 'simulateur-defiscalisation',
    'guide-defiscalisation', 'simulateur-capacite-emprunt', 'simulateur-financement-bien'])
    .optional().default('contact-form'),
  consent: z.union([z.literal(true), z.literal('on')]).transform(() => true),
  meta: z.object({
    property: propriete.optional(),
    // Compatibilité avec un ancien formulaire encore ouvert lors du déploiement.
    estimation: z.union([nombre, z.object({ baseM2: nombre, low: nombre, high: nombre, reco: nombre })]).optional(),
    dispositif: texte(120), travaux: nombre.optional(), tmi: nombre.optional(), tauxMalraux: nombre.optional(),
    guide: texte(100), guideTitle: texte(200), revenus: nombre.optional(), charges: nombre.optional(),
    apport: nombre.optional(), duree: nombre.optional(), taux: nombre.optional(), assurance: nombre.optional(),
    mensualiteMax: nombre.optional(), capitalEmpruntable: nombre.optional(), budget: nombre.optional(),
  }).optional(),
});

export class ErreurDemande extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export type LeadEntrant = Record<string, any> & { id: string; createdAt: string; status: string; idempotencyKey?: string };

/** Clé fournie par le navigateur pour rendre une relance sûre et rejouable. */
export function cleIdempotenceValide(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{8,128}$/.test(value);
}

export function preparerLead(brut: unknown, admin: boolean, id: string, createdAt: string, idempotencyKey?: string): LeadEntrant {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) {
    throw new ErreurDemande('La demande doit contenir des champs valides.');
  }
  let body: Record<string, any>;
  if (admin) {
    body = tronqueLead(brut as Record<string, any>);
    // Cette clé est réservée aux soumissions publiques, jamais au CRM.
    delete body.idempotencyKey;
    delete body.idempotencyFingerprint;
    delete body.notificationSuivi;
  } else {
    const parsed = schemaPublic.safeParse(brut);
    if (!parsed.success) {
      const accordManquant = parsed.error.issues.some(issue => issue.path[0] === 'consent');
      throw new ErreurDemande(accordManquant
        ? 'Merci de confirmer que vous acceptez d’être recontacté au sujet de votre demande.'
        : 'Vérifiez les champs de votre demande et leur longueur.');
    }
    body = parsed.data;
    const souci = leadJoignable(body);
    if (souci) throw new ErreurDemande(souci);
    if (body.email && !z.email().safeParse(body.email).success) throw new ErreurDemande('L’adresse email n’est pas valide.');
    if (body.source === 'estimation-immobilier' && (!body.meta?.property?.city || !body.meta.property.surface)) {
      throw new ErreurDemande('Indiquez l’adresse et la surface du bien à estimer.');
    }
    body.consentRecord = {
      acceptedAt: createdAt, purpose: 'traitement-demande-et-recontact', noticePath: '/confidentialite',
      recordVersion: '2026-09-10',
    };
    body.category = /defiscalisation/.test(body.source) ? 'defiscalisation' : 'immobilier';
  }
  // Les champs système ne peuvent être imposés par le visiteur.
  const payload: LeadEntrant = { ...body, id, createdAt, status: admin ? body.status || 'new' : 'new' };
  if (!admin && cleIdempotenceValide(idempotencyKey)) payload.idempotencyKey = idempotencyKey;
  if (!payload.role) {
    const sujet = String(payload.topic || '').toLowerCase();
    if (payload.source === 'estimation-immobilier' || /vente|estimation|vendre|vendeur/.test(sujet)) {
      payload.role = 'VENDEUR';
      payload.category ||= 'immobilier';
    } else if (/achat|acqu|achet(?:er|eur)/.test(sujet)) {
      payload.role = 'ACHETEUR';
      payload.category ||= 'immobilier';
    }
  }
  return payload;
}

// Limite les octets réellement reçus, même sans Content-Length.
export async function lireCorpsPublic(req: Request, maximum = 32_768): Promise<unknown> {
  const type = req.headers.get('content-type') || '';
  const mime = type.split(';', 1)[0].trim().toLowerCase();
  if (!['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'].includes(mime)) {
    throw new ErreurDemande('Format de demande non pris en charge.', 415);
  }
  if (Number(req.headers.get('content-length')) > maximum) throw new ErreurDemande('Demande trop volumineuse.', 413);
  const reader = req.body?.getReader();
  if (!reader) throw new ErreurDemande('La demande est vide.');
  const chunks: Uint8Array[] = [];
  let taille = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      taille += value.byteLength;
      if (taille > maximum) {
        await reader.cancel();
        throw new ErreurDemande('Demande trop volumineuse.', 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(taille);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const contenu = new TextDecoder().decode(bytes);
  try {
    if (mime === 'application/json') return JSON.parse(contenu);
    const form = await new Response(contenu, { headers: { 'content-type': type } }).formData();
    return { ...Object.fromEntries(form), source: 'contact-form' };
  } catch { throw new ErreurDemande('La demande est illisible.'); }
}

/** Une notification ne doit jamais précéder la sauvegarde du lead. */
export async function enregistrerDemande(
  payload: LeadEntrant, admin: boolean,
  sauvegarder: (lead: LeadEntrant) => Promise<void>, notifier: (lead: LeadEntrant) => Promise<unknown>,
) {
  await sauvegarder(payload);
  if (!admin) await notifier(payload);
}
