import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import type { NextRequest } from 'next/server';

// Prestations personnalisées ajoutées par l'admin, mémorisées pour être
// réutilisables sur les biens suivants (data/custom-features.json).
const FILE = 'custom-features.json';

export async function GET() {
  const data = await readJSON(FILE);
  return NextResponse.json(Array.isArray(data) ? data : []);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const v = String(body?.feature ?? '').trim();
  if (!v) return NextResponse.json({ error: 'Prestation vide' }, { status: 400 });
  const data = await readJSON(FILE);
  const list: string[] = Array.isArray(data) ? data : [];
  if (!list.some((f) => f.toLowerCase() === v.toLowerCase())) {
    list.push(v);
    await writeJSON(FILE, list);
  }
  return NextResponse.json({ ok: true, features: list });
}
