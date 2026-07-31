import { NextResponse } from 'next/server';
import { readJSON, writeJSON, uid } from '@/lib/utils';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { toPublicProperty } from '@/lib/publicProperty';
import { insertPropertySchema } from '@/shared/schema';
import { Resend } from 'resend';

const FILE = 'properties.json';

// Prévient les abonnés à l'alerte « nouveaux biens » lorsqu'un bien visible
// est publié, selon leurs préférences (secteur / type). Silencieux si l'envoi
// échoue (ex. domaine Resend non encore vérifié).
async function notifySubscribers(item: any) {
  try {
    if (item.visible === false || !process.env.RESEND_API_KEY) return;
    const subs = await readJSON('subscribers.json');
    if (!Array.isArray(subs) || subs.length === 0) return;
    const matching = subs.filter(
      (s: any) =>
        (!s.region || s.region === item.region) &&
        (!s.propertyType || s.propertyType === item.type)
    );
    if (matching.length === 0) return;

    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';
    const url = `${base}/immobilier/biens/${item.id}`;
    const region = (item.region || '').toString().replaceAll('_', ' ');
    const price = item.price ? Number(item.price).toLocaleString('fr-FR') + ' €' : '';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1F3B2C">
        <h2 style="color:#B89C6D">Nouveau bien — Lemeille Patrimoine</h2>
        <h3 style="margin:8px 0">${item.title || 'Bien'}</h3>
        <p style="color:#555">${item.city || ''}${region ? ' · ' + region : ''}${price ? ' — <strong>' + price + '</strong>' : ''}</p>
        <p><a href="${url}" style="background:#B89C6D;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Découvrir le bien</a></p>
        <p style="font-size:12px;color:#999;margin-top:24px">Vous recevez cet email car vous êtes inscrit à notre alerte nouveaux biens.</p>
      </div>`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>';
    await Promise.allSettled(
      matching.map((s: any) =>
        resend.emails.send({ from, to: s.email, subject: `Nouveau bien à ${item.city || ''} — Lemeille Patrimoine`, html })
      )
    );
  } catch (error) {
    console.error('Erreur notification abonnés:', error);
  }
}
export async function GET(req: NextRequest) {
  const data = await readJSON(FILE);
  if (isAdmin(req)) {
    return NextResponse.json(data);
  }
  return NextResponse.json(
    data.filter((p: any) => p.visible !== false).map(toPublicProperty)
  );
}
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const validation = insertPropertySchema.omit({ id: true }).safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 });
  }
  const data = await readJSON(FILE);
  const item = { id: uid('b'), ...validation.data };
  data.push(item);
  await writeJSON(FILE, data);
  await notifySubscribers(item);
  return NextResponse.json(item);
}
