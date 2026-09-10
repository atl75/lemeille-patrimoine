import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSessionValue } from '@/lib/adminSession';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: Request) {
  /**
   * Dix essais par quart d'heure et par adresse.
   *
   * Rien ne limitait cette route : un mot de passe pouvait être cherché à
   * volonté, sans bruit, alors que le projet dispose déjà d'un limiteur posé
   * sur huit autres routes bien moins sensibles. Dix essais laissent de la
   * marge à une faute de frappe et ferment la recherche exhaustive.
   */
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = rateLimit('login:' + ip, 10, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  // Un corps illisible ne doit pas produire une erreur 500 : elle serait
  // comptée comme une panne du serveur alors que c'est une requête malformée.
  let password: unknown;
  try { ({ password } = await req.json()); }
  catch { return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 }); }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD not set' }, { status: 500 });
  }

  // Comparaison à temps constant (évite les attaques temporelles)
  const a = Buffer.from(String(password ?? ''));
  const b = Buffer.from(expected);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const isDev = process.env.NODE_ENV === 'development';
  const value = createSessionValue();
  const flags = isDev
    ? `lp_admin=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    : `lp_admin=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`;
  res.headers.set('Set-Cookie', flags);
  return res;
}
