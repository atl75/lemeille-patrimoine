import { NextResponse } from 'next/server';
import { envoyerEmail } from '@/lib/envoiEmail';
import { readJSON, uid, updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { EMAIL_SIGNATURE_HTML } from '@/lib/emailSignature';
import { cleIdempotenceValide, ErreurDemande, lireCorpsPublic, preparerLead, enregistrerDemande } from '@/lib/leadIntake';
import { notifierLead } from '@/lib/leadNotifications';
import { sauvegarderLeadUnique } from '@/lib/leadIdempotency';
import { initialiserSuiviNotification, noterNotification } from '@/lib/suiviNotificationLead';

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await readJSON('leads.json'));
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = rateLimit(`leads:${ip}`, 8, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Trop de demandes, réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
  }
  const admin = isAdmin(req);
  const json = (req.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase() === 'application/json';
  try {
    let brut: unknown;
    if (admin && json) {
      // La saisie authentifiée conserve ses pièces jointes et ses champs métier.
      try { brut = await req.json(); }
      catch { throw new ErreurDemande('La demande est illisible.'); }
    } else {
      brut = await lireCorpsPublic(req);
    }
    const rawKey = req.headers.get('idempotency-key');
    if (!admin && rawKey !== null && !cleIdempotenceValide(rawKey)) {
      throw new ErreurDemande('La référence de votre demande est invalide. Rechargez le formulaire.');
    }
    const idempotencyKey = !admin && cleIdempotenceValide(rawKey) ? rawKey : undefined;
    const payload = preparerLead(brut, admin, uid('L'), new Date().toISOString(), idempotencyKey);
    if (!admin) payload.notificationSuivi = initialiserSuiviNotification(payload.email, payload.createdAt);
    let duplicateId: string | undefined;
    await enregistrerDemande(payload, admin,
      async lead => {
        const saved = await sauvegarderLeadUnique(lead, mutate => updateJSON('leads.json', mutate), SANS_ECRITURE);
        duplicateId = saved.cree ? undefined : saved.id;
      },
      async lead => {
        if (duplicateId) return;
        const resultats = await notifierLead(lead, {
          envoyer: envoyerEmail,
          agence: process.env.LEADS_TO_EMAIL || 'arthur@lemeillepatrimoine.com',
          signature: EMAIL_SIGNATURE_HTML,
          noter: async (canal,resultat) => {
            await updateJSON('leads.json', leads => noterNotification(leads,lead.id,lead.createdAt,canal,resultat,new Date().toISOString(),SANS_ECRITURE));
          },
        });
        for (const [destinataire, resultat] of Object.entries(resultats)) {
          if (resultat && !resultat.ok) {
            console.error('[leads] notification non envoyée', { leadId: lead.id, destinataire, configuration: !!resultat.configuration });
          }
        }
      });
    // Les emails répondent aux demandes publiques, jamais à une saisie manuelle du CRM.
    // Un refus email ne transforme pas un lead déjà sauvegardé en échec de saisie.
    return json ? NextResponse.json({ success: true, id: duplicateId || payload.id })
      : NextResponse.redirect(new URL('/contact?ok=1', req.url), 303);
  } catch (error) {
    if (error instanceof ErreurDemande) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[leads] enregistrement impossible');
    return NextResponse.json({ error: 'Votre demande n’a pas pu être enregistrée. Réessayez ou appelez le 06 87 15 72 59.' }, { status: 500 });
  }
}
