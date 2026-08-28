import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { MAIL_COPY } from '@/lib/mailCopy';
import { EMAIL_SIGNATURE_HTML } from '@/lib/emailSignature';
import { Resend } from 'resend';

// Envoie au lead (acheteur) une sélection de biens correspondant à sa recherche.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const propertyIds: string[] = Array.isArray(body?.propertyIds) ? body.propertyIds : [];

  const leads = await readJSON('leads.json');
  const lead = Array.isArray(leads) ? leads.find((l: any) => l.id === id) : null;
  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });
  if (!lead.email) return NextResponse.json({ error: 'Ce lead n\'a pas d\'email.' }, { status: 400 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Envoi d\'email non configuré (RESEND_API_KEY).' }, { status: 400 });

  const properties = await readJSON('properties.json');
  const list = (Array.isArray(properties) ? properties : [])
    .filter((p: any) => propertyIds.includes(p.id) && p.visible !== false && !p.sold && p.status !== 'SOLD');
  if (list.length === 0) return NextResponse.json({ error: 'Aucun bien valide à proposer.' }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';
  const firstName = lead.firstName || '';

  const cards = list.map((p: any) => {
    const region = String(p.region || '').replaceAll('_', ' ');
    const loc = [p.city, region].filter(Boolean).join(' · ');
    const price = p.priceOnRequest ? 'Nous consulter' : (p.price ? Number(p.price).toLocaleString('fr-FR') + ' €' : '');
    const surface = p.surface ? `${p.surface} m²` : '';
    const rooms = p.rooms ? `${p.rooms} pièces` : '';
    const specs = [surface, rooms].filter(Boolean).join(' · ');
    const img = Array.isArray(p.images) && p.images[0] ? p.images[0] : '';
    const url = `${base}/immobilier/biens/${p.id}`;
    return `
      <tr><td style="padding:0 0 16px">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E4DECF;border-radius:10px;overflow:hidden">
          <tr>
            ${img ? `<td width="180" style="vertical-align:top"><a href="${url}"><img src="${img}" width="180" style="display:block;width:180px;height:120px;object-fit:cover" alt=""></a></td>` : ''}
            <td style="padding:12px 16px;vertical-align:top">
              <div style="font-family:Georgia,serif;font-size:16px;color:#1F3B2C;font-weight:bold">${p.title || 'Bien'}</div>
              <div style="color:#6C7268;font-size:13px;margin:3px 0">${loc}${specs ? ' — ' + specs : ''}</div>
              <div style="color:#8A6D3F;font-weight:bold;font-size:15px;margin:6px 0">${price}</div>
              <a href="${url}" style="display:inline-block;margin-top:6px;background:#8A6D3F;color:#fff;text-decoration:none;font-size:13px;padding:7px 14px;border-radius:8px">Découvrir le bien</a>
            </td>
          </tr>
        </table>
      </td></tr>`;
  }).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1C271F">
      <h2 style="color:#8A6D3F;font-family:Georgia,serif;font-weight:normal">Une sélection de biens pour vous</h2>
      <p>Bonjour ${firstName},</p>
      <p>Suite à votre recherche, voici une première sélection de biens qui pourraient vous correspondre :</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">${cards}</table>
      <p style="margin-top:18px">N'hésitez pas à me contacter pour organiser une visite ou affiner votre recherche.</p>
      ${EMAIL_SIGNATURE_HTML}
      <p style="font-size:11px;color:#999;margin-top:20px">Vous recevez cet email car vous avez sollicité Lemeille Patrimoine pour un projet immobilier.</p>
    </div>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>';
    await resend.emails.send({
      from,
      to: lead.email,
      bcc: MAIL_COPY,
      subject: `Votre sélection de biens — Lemeille Patrimoine (${list.length})`,
      html,
    });
    return NextResponse.json({ ok: true, count: list.length });
  } catch (e: any) {
    console.error('Erreur envoi sélection biens:', e);
    return NextResponse.json({ error: 'Échec de l\'envoi de l\'email.' }, { status: 500 });
  }
}
