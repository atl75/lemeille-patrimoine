import { NextResponse } from 'next/server';
import { envoyerEmail } from '@/lib/envoiEmail';
import type { NextRequest } from 'next/server';
import { updateJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { EMAIL_SIGNATURE_HTML } from '@/lib/emailSignature';
import crypto from 'crypto';

/**
 * Avenants à un mandat — changement de prix.
 *
 * Un mandat signé est FIGÉ : PATCH /api/mandats/[id] répond 409. Cette route
 * est donc la seule voie pour changer le prix d'un mandat déjà signé, et elle
 * l'assume : elle n'écrase rien, elle AJOUTE un acte qui porte l'ancien prix
 * autant que le nouveau. Sans cette trace, plus rien ne prouverait ce sur quoi
 * les parties s'étaient entendues au départ.
 *
 * L'avenant vit DANS son mandat (mandat.avenants[]) et non dans une collection
 * séparée : c'est une pièce du contrat, pas un document autonome, et cela
 * évite qu'un avenant survive à la suppression du mandat qu'il modifie.
 */

// Même règle que la demande de signature du mandat : une personne physique
// signe elle-même, une société signe par son représentant légal.
function signataireDe(o: any): { name: string; email: string; phone: string } {
  if (!o) return { name: '', email: '', phone: '' };
  if (o.type === 'COMPANY') {
    const rep = [o.managerFirstName, o.managerLastName].filter(Boolean).join(' ');
    return { name: rep || o.name || '', email: o.email || '', phone: o.phone || '' };
  }
  return { name: [o.firstName, o.lastName].filter(Boolean).join(' '), email: o.email || '', phone: o.phone || '' };
}

const nombre = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[  ]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  let sortie: any = null;
  await updateJSON('mandats.json', (data) => {
    const m = (Array.isArray(data) ? data : []).find((x: any) => x.id === id);
    sortie = m ? { avenants: Array.isArray(m.avenants) ? m.avenants : [] } : { error: 'Mandat non trouvé' };
    return data; // lecture seule : rien n'est écrit
  });
  if (sortie?.error) return NextResponse.json(sortie, { status: 404 });
  return NextResponse.json(sortie);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  let corps: any;
  try { corps = await req.json(); } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }); }

  const nouveauPrix = nombre(corps?.newPrice);
  if (nouveauPrix === null || nouveauPrix <= 0) {
    return NextResponse.json({ error: 'Le nouveau prix est obligatoire et doit être supérieur à zéro.' }, { status: 400 });
  }
  const pctDemande = nombre(corps?.newCommissionPercentage);
  if (pctDemande !== null && (pctDemande < 0 || pctDemande > 100)) {
    return NextResponse.json({ error: "Le taux d'honoraires doit être compris entre 0 et 100." }, { status: 400 });
  }

  let resultat: any = null;
  await updateJSON('mandats.json', (data) => {
    const liste = Array.isArray(data) ? data : [];
    const i = liste.findIndex((x: any) => x.id === id);
    if (i < 0) { resultat = { error: 'Mandat non trouvé', code: 404 }; return data; }
    const m = liste[i];

    const ancien = {
      price: m.price ?? null,
      netSellerAmount: m.netSellerAmount ?? null,
      commissionAmount: m.commissionAmount ?? null,
      commissionPercentage: m.commissionPercentage ?? null,
    };

    if (ancien.price != null && Number(ancien.price) === nouveauPrix && pctDemande === null) {
      resultat = { error: 'Le nouveau prix est identique au prix en vigueur.', code: 400 };
      return data;
    }

    // Le taux d'honoraires est conservé sauf renégociation explicite ; les
    // honoraires et le net vendeur en découlent, comme dans le mandat initial.
    const pct = pctDemande ?? (ancien.commissionPercentage != null ? Number(ancien.commissionPercentage) : null);
    const honoraires = pct != null
      ? Math.round(nouveauPrix * pct / 100)
      : (ancien.commissionAmount != null ? Number(ancien.commissionAmount) : 0);
    const nouveau = {
      price: nouveauPrix,
      commissionPercentage: pct,
      commissionAmount: honoraires,
      netSellerAmount: nouveauPrix - honoraires,
    };

    const avenants: any[] = Array.isArray(m.avenants) ? m.avenants : [];
    const proprietaires = Array.isArray(m.owners) && m.owners.length ? m.owners : [{ type: 'INDIVIDUAL' }];

    const avenant = {
      id: 'avenant' + crypto.randomBytes(12).toString('hex'),
      numero: avenants.length + 1,
      objet: 'PRIX',
      createdAt: new Date().toISOString(),
      motif: (corps?.motif || '').toString().slice(0, 300),
      ancien,
      nouveau,
      // Un signataire par mandant, comme pour le mandat : autant de signatures
      // que de personnes engagées.
      signers: proprietaires.map((o: any, idx: number) => ({
        ownerIndex: idx,
        token: crypto.randomBytes(24).toString('hex'),
        ...signataireDe(o),
      })),
      signStatus: 'PENDING',
    };

    liste[i] = { ...m, avenants: [...avenants, avenant] };
    resultat = { mandat: liste[i], avenant };
    return liste;
  });

  if (resultat?.error) return NextResponse.json({ error: resultat.error }, { status: resultat.code || 400 });

  // Envoi des liens de signature, sur le modèle du mandat.
  const m = resultat.mandat;
  const av = resultat.avenant;
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';
  const sortie: any[] = [];
  for (const s of av.signers) {
    const url = `${base}/mandat/signer/${s.token}`;
    let envoye = false;
    let raison: string | undefined;
    if (s.email) {
      const envoi = await envoyerEmail({
        to: s.email,
        subject: `Avenant à votre mandat de vente${m.mandateNumber ? ` — N° ${m.mandateNumber}` : ''}`,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.5"><p>Bonjour ${s.name || ''},</p><p>Un avenant à votre mandat de vente${m.mandateNumber ? ` (N° ${m.mandateNumber})` : ''} vous attend : il porte le prix de vente à ${Math.round(av.nouveau.price).toLocaleString('fr-FR')} €.</p><p><a href="${url}" style="display:inline-block;background:#1F3B2C;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Lire et signer l'avenant</a></p><p style="font-size:12px;color:#999">${url}</p>${EMAIL_SIGNATURE_HTML}</div>`,
      });
      envoye = envoi.ok;
      if (!envoi.ok) raison = envoi.raison;
    }
    sortie.push({ name: s.name, email: s.email, phone: s.phone, url, signed: false, emailed: envoye, raison });
  }

  return NextResponse.json({ avenant: av, signers: sortie });
}
