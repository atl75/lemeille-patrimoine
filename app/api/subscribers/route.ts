import { NextResponse } from 'next/server';
import { readJSON, uid, updateJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import type { NextRequest } from 'next/server';

// Abonnés à l'alerte « nouveaux biens » (avant-première off-market).
const FILE = 'subscribers.json';

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await readJSON(FILE);
  return NextResponse.json(Array.isArray(data) ? data : []);
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = rateLimit(`subscribers:${ip}`, 5, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Trop de requêtes, réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!email || email.length > 200 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }
  await updateJSON(FILE, (data) => {
    const list: any[] = Array.isArray(data) ? data : [];
    const existing = list.find((s) => (s.email || '').toLowerCase() === email);
    if (existing) {
      existing.region = body.region || existing.region;
      existing.propertyType = body.propertyType || existing.propertyType;
    } else {
      list.push({
        id: uid('S'),
        email,
        region: String(body.region || '').slice(0, 80),
        propertyType: String(body.propertyType || '').slice(0, 40),
        createdAt: new Date().toISOString(),
      });
    }
    return list;
  });
  return NextResponse.json({ ok: true });
}
