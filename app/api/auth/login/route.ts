import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSessionValue } from '@/lib/adminSession';

export async function POST(req: Request) {
  const { password } = await req.json();

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
