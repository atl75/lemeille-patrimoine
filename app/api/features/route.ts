import { NextResponse } from 'next/server';
import { readJSON, updateJSON } from '@/lib/utils';
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
  const result = await updateJSON(FILE, list => {
    if (!list.some((f: string) => f.toLowerCase() === v.toLowerCase())) list.push(v);
    return { ok: true, features: list };
  });
  return NextResponse.json(result);
}
