import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { liensSignatureExistants } from '@/lib/liensSignature';
import { erreurMandatImmeuble } from '@/lib/validationMandatImmeuble';
import { isAdmin } from '@/lib/adminGuard';
import { envoyerEmail } from '@/lib/envoiEmail';
import { EMAIL_SIGNATURE_HTML } from '@/lib/emailSignature';
import crypto from 'crypto';
import { signatairesInvitationMandat } from '@/lib/signatairesInvitationMandat';

// Crée / met à jour les liens de signature d'un mandat : UN signataire par
// mandant (autant de signatures que de mandants). Les mandants déjà signés
// conservent leur signature ; les liens existants restent stables.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const records = await readJSON('mandats.json', { fresh: true });
  const m = (Array.isArray(records) ? records : []).find((r: any) => r.id === id);
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!m) return NextResponse.json({ error: 'Mandat non trouvé' }, { status: 404, headers });
  const avenantId = req.nextUrl.searchParams.get('avenantId');
  const document = avenantId ? (Array.isArray(m.avenants) ? m.avenants : []).find((a: any) => a.id === avenantId) : m;
  if (!document) return NextResponse.json({ error: 'Avenant non trouvé' }, { status: 404, headers });
  return NextResponse.json({
    documentLabel: avenantId ? `Avenant n° ${document.numero || ''}` : 'Mandat',
    signers: liensSignatureExistants(document, process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com', !avenantId),
  }, { headers });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  let result: any = null;
  await updateJSON('mandats.json', (data) => {
    result=null;
    const i = (Array.isArray(data) ? data : []).findIndex((x: any) => x.id === id);
    if (i < 0) { result = { error: 'Mandat non trouvé' }; return SANS_ECRITURE; }
    const m = data[i];
    const erreur=erreurMandatImmeuble(m);if(erreur){result={error:erreur,status:409};return SANS_ECRITURE;}
    if (m.mandateSignStatus === 'SIGNED') { result = { error: 'Ce mandat est déjà signé.', status: 409 }; return SANS_ECRITURE; }
    const owners = Array.isArray(m.owners) && m.owners.length ? m.owners : [{ type: 'INDIVIDUAL' }];
    const prev: any[] = Array.isArray(m.signers) ? m.signers : [];
    const preparation = signatairesInvitationMandat(owners, prev, () => crypto.randomBytes(24).toString('hex'));
    if (preparation.error) { result = { error: preparation.error, status: 409 }; return SANS_ECRITURE; }
    const signers = preparation.signers!;
    const allSigned = signers.length > 0 && signers.every((s: any) => !!s.dataUrl);
    data[i] = { ...m, signers, mandateSignStatus: allSigned ? 'SIGNED' : 'PENDING' };
    result = { mandat: data[i] };
    return data;
  });

  if (result?.error) return NextResponse.json({ error: result.error }, { status: result.status || 404 });
  const m = result.mandat;
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';

  const out: any[] = [];
  for (const s of m.signers) {
    const url = `${base}/mandat/signer/${s.token}`;
    let emailed = false;
    // `raison` remonte jusqu'à l'écran : un lien de signature qui n'est pas
    // parti doit se voir tout de suite, sinon l'agent attend une signature que
    // le mandant n'a jamais été invité à donner.
    let raison: string | undefined;
    if (!s.dataUrl && s.email) {
      const envoi = await envoyerEmail({
        to: s.email,
        subject: `Signature de votre mandat de vente${m.mandateNumber ? ` — N° ${m.mandateNumber}` : ''}`,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.5"><p>Bonjour ${s.name || ''},</p><p>Votre mandat de vente${m.mandateNumber ? ` (N° ${m.mandateNumber})` : ''} est prêt à être signé :</p><p><a href="${url}" style="display:inline-block;background:#1F3B2C;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Lire et signer le mandat</a></p><p style="font-size:12px;color:#999">${url}</p>${EMAIL_SIGNATURE_HTML}</div>`,
      });
      emailed = envoi.ok;
      if (!envoi.ok) raison = envoi.raison;
    }
    out.push({ name: s.name, email: s.email, phone: s.phone, url, signed: !!s.dataUrl, emailed, raison });
  }
  return NextResponse.json({ signers: out });
}
