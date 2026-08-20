import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

const FILE = 'mandats.json';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await readJSON(FILE);
  const m = (Array.isArray(data) ? data : []).find((x: any) => x.id === id);
  if (!m) return NextResponse.json({ error: 'Mandat non trouvé' }, { status: 404 });
  return NextResponse.json(m);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await readJSON(FILE);
  const i = (Array.isArray(data) ? data : []).findIndex((x: any) => x.id === id);
  if (i < 0) return NextResponse.json({ error: 'Mandat non trouvé' }, { status: 404 });
  let updates: any;
  try { updates = await req.json(); } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }); }
  data[i] = { ...data[i], ...updates, id: data[i].id, createdAt: data[i].createdAt };
  await writeJSON(FILE, data);
  return NextResponse.json({ success: true, mandat: data[i] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await readJSON(FILE);
  const i = (Array.isArray(data) ? data : []).findIndex((x: any) => x.id === id);
  if (i < 0) return NextResponse.json({ error: 'Mandat non trouvé' }, { status: 404 });
  data.splice(i, 1);
  await writeJSON(FILE, data);
  return NextResponse.json({ success: true });
}
