import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { createDraft, isConnected } from '@/lib/googleMail';
import { EMAIL_SIGNATURE_HTML_CID, EMAIL_SEPARATOR, EMAIL_SIGNATURE_LOGO_B64, EMAIL_SIGNATURE_LOGO_MIME, EMAIL_LOGO_CID } from '@/lib/emailSignature';

const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
const eur = (n?: number) => (n || n === 0) ? Math.round(Number(n)).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' €' : '—';
const ownerName = (o: any) => o?.type === 'COMPANY'
  ? `${esc(o.name || '')}${o.siren ? ` (SIREN ${esc(o.siren)})` : ''}${(o.managerFirstName || o.managerLastName) ? `, représentée par ${esc([o.managerFirstName, o.managerLastName].filter(Boolean).join(' '))}${o.managerRole ? ` (${esc(o.managerRole)})` : ''}` : ''}`
  : esc([o?.firstName, o?.lastName].filter(Boolean).join(' '));

// Décrit un notaire en HTML (ligne par ligne).
function notaryBlock(n: any): string {
  if (!n || !(n.officeName || n.notaryName || n.email)) return '<p style="margin:2px 0;color:#888">Notaire non renseigné.</p>';
  const rows = [
    n.officeName ? `Étude : ${esc(n.officeName)}` : '',
    n.notaryName ? `Notaire : ${esc(n.notaryName)}` : '',
    [n.address, n.postalCode, n.city].filter(Boolean).length ? `Adresse : ${esc([n.address, n.postalCode, n.city].filter(Boolean).join(', '))}` : '',
    n.phone ? `Tél : ${esc(n.phone)}` : '',
    n.email ? `Email : ${esc(n.email)}` : '',
    (n.clerkName || n.clerkEmail) ? `Clerc : ${esc(n.clerkName || '')}${n.clerkEmail ? ` — ${esc(n.clerkEmail)}` : ''}` : '',
  ].filter(Boolean);
  return rows.map((r) => `<div>${r}</div>`).join('');
}

// Résout un document (data URL base64 ou URL Cloudinary) en pièce jointe.
async function toAttachment(value: string | undefined, filename: string) {
  if (!value) return null;
  try {
    if (value.startsWith('data:')) {
      const m = value.match(/^data:([^;]+);base64,(.*)$/s);
      if (!m) return null;
      return { filename, mime: m[1] || 'application/octet-stream', base64: m[2] };
    }
    const res = await fetch(value);
    if (!res.ok) return null;
    const mime = res.headers.get('content-type') || 'application/octet-stream';
    const base64 = Buffer.from(await res.arrayBuffer()).toString('base64');
    return { filename, mime, base64 };
  } catch { return null; }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isConnected())) return NextResponse.json({ error: 'Gmail non connecté. Cliquez sur « Connecter Gmail » d\'abord.' }, { status: 400 });

  const { id } = await params;
  const props = await readJSON('properties.json');
  const p = (Array.isArray(props) ? props : []).find((x: any) => x.id === id);
  if (!p) return NextResponse.json({ error: 'Bien non trouvé' }, { status: 404 });

  const to = [p.sellerNotary?.email, p.buyerNotary?.email].map((e) => (e || '').trim()).filter(Boolean);
  if (!to.length) return NextResponse.json({ error: 'Aucun email de notaire renseigné sur la fiche (vendeur ou acquéreur).' }, { status: 400 });

  // Clercs de notaire : chaque notaire a son propre clerc ; leurs emails sont mis en copie (Cc).
  const cc = Array.from(new Set(
    [p.sellerNotary?.clerkEmail, p.buyerNotary?.clerkEmail, p.notaryClerk?.email]
      .map((e: any) => (e || '').trim()).filter(Boolean)
  ));

  const typeLabel = ((p.type || 'APPARTEMENT') === 'MAISON' ? 'Maison' : 'Appartement') + (p.rooms ? ` T${p.rooms}` : '');
  const address = p.map?.query || [p.city, String(p.region || '').replaceAll('_', ' ')].filter(Boolean).join(', ');
  const owners = Array.isArray(p.owners) ? p.owners : [];
  // Prix issu de la négociation avec l'acquéreur (prix FAI final), avec repli sur le prix affiché.
  const saleFAI = Number(p.finalSalePrice ?? p.price ?? 0);
  const listingNet = Number(p.netSellerAmount ?? p.price ?? 0);
  const listingCommission = Number(p.commissionAmount ?? Math.max(0, (Number(p.price) || 0) - listingNet));
  const commission = Number(p.negotiatedCommission ?? listingCommission ?? 0);
  const netVendeur = Math.max(0, saleFAI - commission);
  const buyer = [p.buyerFirstName, p.buyerLastName].filter(Boolean).join(' ');
  // Ligne de contact (téléphone + email) labellisée.
  const contact = (email?: string, phone?: string) => {
    const parts = [phone ? `Tél : ${esc(phone)}` : '', email ? `Email : ${esc(email)}` : ''].filter(Boolean);
    return parts.length ? `<div style="color:#555">${parts.join(' &middot; ')}</div>` : '';
  };

  const S = (t: string) => `<h3 style="margin:20px 0 6px;color:#1F3B2C;font-size:15px;border-bottom:1px solid #e5e5e5;padding-bottom:4px">${t}</h3>`;
  const chargeLabel = (p.mandateHonorairesCharge || 'ACQUEREUR') === 'VENDEUR' ? 'à la charge du vendeur' : "à la charge de l'acquéreur";
  const furniture = (Array.isArray(p.furniture) ? p.furniture : []).filter((f: any) => f && (f.label || f.value));
  const furnitureTotal = furniture.reduce((s: number, f: any) => s + (Number(f.value) || 0), 0);
  const furnitureHtml = furniture.length
    ? `${S('5. Mobilier vendu')}<table style="border-collapse:collapse;font-size:14px;margin-top:4px"><tbody>${furniture.map((f: any) => `<tr><td style="padding:2px 16px 2px 0">${esc(f.label || '—')}</td><td style="padding:2px 0;text-align:right">${eur(Number(f.value) || 0)}</td></tr>`).join('')}<tr style="border-top:1px solid #ccc;font-weight:bold"><td style="padding:5px 16px 2px 0">Total mobilier</td><td style="padding:5px 0;text-align:right">${eur(furnitureTotal)}</td></tr></tbody></table>`
    : '';
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.55">
    <p>Chers Maîtres,</p>
    <p>Dans le cadre de la vente ci-dessous, vous trouverez en pièces jointes les documents du dossier. Je reste à votre disposition.</p>

    ${S('1. Le bien')}
    <div>Type : ${esc(typeLabel)}</div>
    <div>Adresse : ${esc(address)}</div>
    ${p.surface ? `<div>Superficie : ${esc(p.surface)} m²</div>` : ''}
    ${p.cadastralReference ? `<div>Référence cadastrale : ${esc(p.cadastralReference)}</div>` : ''}
    ${p.dpe?.classEnergy ? `<div>DPE : ${esc(p.dpe.classEnergy)}${p.dpe.classGES ? ` / GES ${esc(p.dpe.classGES)}` : ''}</div>` : ''}

    ${S('2. Le vendeur et son notaire')}
    <div><strong>Vendeur${owners.length > 1 ? 's' : ''} :</strong></div>
    ${owners.length ? owners.map((o: any) => `<div>${ownerName(o)}${o.address ? ` — ${esc(o.address)}` : ''}</div>${contact(o.email, o.phone)}`).join('') : '<div style="color:#888">Non renseigné.</div>'}
    <div style="margin-top:8px"><strong>Notaire du vendeur :</strong></div>
    ${notaryBlock(p.sellerNotary)}

    ${S('3. L\'acquéreur et son notaire')}
    <div><strong>Acquéreur :</strong></div>
    ${buyer || p.buyerEmail || p.buyerPhone || p.buyerAddress
      ? `<div>${esc(buyer) || '—'}${p.buyerAddress ? ` — ${esc(p.buyerAddress)}` : ''}</div>${contact(p.buyerEmail, p.buyerPhone)}`
      : '<div style="color:#888">Non renseigné.</div>'}
    <div style="margin-top:8px"><strong>Notaire de l\'acquéreur :</strong></div>
    ${notaryBlock(p.buyerNotary)}

    ${S('4. Conditions financières')}
    <div>Montant de la vente (FAI) : <strong>${eur(saleFAI)}</strong></div>
    <div>Commission d'agence (${chargeLabel}) : ${eur(commission)}</div>
    <div>Prix net vendeur : ${eur(netVendeur)}</div>
    <div>Séquestre : ${eur(p.sequestreAmount != null ? Number(p.sequestreAmount) : undefined)}</div>

    ${furnitureHtml}

    ${EMAIL_SEPARATOR}
    ${EMAIL_SIGNATURE_HTML_CID}
  </div>`;

  // Pièces jointes : documents présents sur la fiche.
  const docs: Array<[string | undefined, string]> = [
    [p.titleDeed, 'Titre-de-propriete.pdf'],
    [p.dpeDocument, 'DPE.pdf'],
    [p.propertyTax, 'Taxe-fonciere.pdf'],
    [p.mandate, 'Mandat.pdf'],
    [p.estimation, 'Estimation.pdf'],
    [p.propertyRules, 'Reglement-copropriete.pdf'],
    [p.chargesStatement, 'Etat-des-charges.pdf'],
    [p.floorPlan, 'Plan.pdf'],
    ...((Array.isArray(p.floorPlans) ? p.floorPlans : []).map((v: string, i: number) => [v, `Plan-${i + 1}.pdf`] as [string, string])),
    ...((Array.isArray(p.agMinutes) ? p.agMinutes : []).map((v: string, i: number) => [v, `PV-AG-${i + 1}.pdf`] as [string, string])),
  ];
  const attachments = (await Promise.all(docs.map(([v, name]) => toAttachment(v, name)))).filter(Boolean) as any[];

  const subject = `Vente ${typeLabel} — ${address} — transmission du dossier`;
  const inlineImages = EMAIL_SIGNATURE_LOGO_B64
    ? [{ cid: EMAIL_LOGO_CID, mime: EMAIL_SIGNATURE_LOGO_MIME, base64: EMAIL_SIGNATURE_LOGO_B64 }]
    : [];
  try {
    const draftId = await createDraft(to, subject, html, attachments, { cc, inlineImages });
    return NextResponse.json({ ok: true, draftId, recipients: to, cc, attachments: attachments.length });
  } catch (e: any) {
    console.error('Création brouillon notaires:', e);
    return NextResponse.json({ error: 'Échec de la création du brouillon Gmail.' }, { status: 500 });
  }
}
