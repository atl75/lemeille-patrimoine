import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { MAIL_COPY } from '@/lib/mailCopy';
import { EMAIL_SIGNATURE_HTML } from '@/lib/emailSignature';
import crypto from 'crypto';

// Détermine le signataire d'un mandant : une personne physique signe elle-même ;
// une société est signée par son représentant légal (email/tél de la société).
function signerFromOwner(o: any): { name: string; email: string; phone: string } {
  if (!o) return { name: '', email: '', phone: '' };
  if (o.type === 'COMPANY') {
    const rep = [o.managerFirstName, o.managerLastName].filter(Boolean).join(' ');
    return { name: rep || o.name || '', email: o.email || '', phone: o.phone || '' };
  }
  return { name: [o.firstName, o.lastName].filter(Boolean).join(' '), email: o.email || '', phone: o.phone || '' };
}

// Crée / met à jour les liens de signature d'un mandat : UN signataire par
// mandant (autant de signatures que de mandants). Les mandants déjà signés
// conservent leur signature ; les liens existants restent stables.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  let result: any = null;
  await updateJSON('mandats.json', (data) => {
    const i = (Array.isArray(data) ? data : []).findIndex((x: any) => x.id === id);
    if (i < 0) { result = { error: 'Mandat non trouvé' }; return data; }
    const m = data[i];
    if (m.mandateSignStatus === 'SIGNED') { result = { error: 'Ce mandat est déjà signé.' }; return data; }
    const owners = Array.isArray(m.owners) && m.owners.length ? m.owners : [{ type: 'INDIVIDUAL' }];
    const prev: any[] = Array.isArray(m.signers) ? m.signers : [];
    const signers = owners.map((o: any, idx: number) => {
      const info = signerFromOwner(o);
      const existing = prev.find((s: any) => s.ownerIndex === idx);
      if (existing?.dataUrl) return { ...existing, ...info, ownerIndex: idx }; // signature conservée
      return { ownerIndex: idx, token: existing?.token || crypto.randomBytes(24).toString('hex'), ...info };
    });
    const allSigned = signers.length > 0 && signers.every((s: any) => !!s.dataUrl);
    data[i] = { ...m, signers, mandateSignStatus: allSigned ? 'SIGNED' : 'PENDING' };
    result = { mandat: data[i] };
    return data;
  });

  if (result?.error) return NextResponse.json({ error: result.error }, { status: 404 });
  const m = result.mandat;
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';

  const out: any[] = [];
  for (const s of m.signers) {
    const url = `${base}/mandat/signer/${s.token}`;
    let emailed = false;
    if (!s.dataUrl && s.email && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>',
          to: s.email,
          bcc: MAIL_COPY,
          subject: `Signature de votre mandat de vente${m.mandateNumber ? ` — N° ${m.mandateNumber}` : ''}`,
          html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.5"><p>Bonjour ${s.name || ''},</p><p>Votre mandat de vente${m.mandateNumber ? ` (N° ${m.mandateNumber})` : ''} est prêt à être signé :</p><p><a href="${url}" style="display:inline-block;background:#1F3B2C;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Lire et signer le mandat</a></p><p style="font-size:12px;color:#999">${url}</p>${EMAIL_SIGNATURE_HTML}</div>`,
        });
        emailed = true;
      } catch (e) { emailed = false; console.error(`Envoi lien de signature échoué (${s.email}):`, e); }
    }
    out.push({ name: s.name, email: s.email, phone: s.phone, url, signed: !!s.dataUrl, emailed });
  }
  return NextResponse.json({ signers: out });
}
