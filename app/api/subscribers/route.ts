import { NextResponse } from 'next/server';
import { readJSON, writeJSON, uid } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import type { NextRequest } from 'next/server';

// Abonnés à l'alerte « nouveaux biens » (avant-première off-market).
const FILE = 'subscribers.json';

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await readJSON(FILE);
  return NextResponse.json(Array.isArray(data) ? data : []);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }
  const data = await readJSON(FILE);
  const list: any[] = Array.isArray(data) ? data : [];
  const existing = list.find((s) => (s.email || '').toLowerCase() === email);
  if (existing) {
    // Met à jour les préférences si déjà abonné
    existing.region = body.region || existing.region;
    existing.propertyType = body.propertyType || existing.propertyType;
  } else {
    list.push({
      id: uid('S'),
      email,
      region: body.region || '',
      propertyType: body.propertyType || '',
      createdAt: new Date().toISOString(),
    });
  }
  await writeJSON(FILE, list);
  return NextResponse.json({ ok: true });
}
