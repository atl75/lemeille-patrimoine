import { NextResponse } from 'next/server';
import { readJSON, updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import type { NextRequest } from 'next/server';
import { insertProgramSchema } from '@/shared/schema';
import { programCollection } from '@/lib/programsData';

const FILE = 'programs.json';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = programCollection(await readJSON(FILE, { fresh: true }));
  const item = data.find((p: any) => p.id === id);
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!item || (!isAdmin(req) && item.visible === false)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers });
  return NextResponse.json(item, { headers });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const validation = insertProgramSchema.omit({ id: true }).safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 });
  }
  const item = await updateJSON(FILE, data => {
    const idx = data.findIndex((p: any) => p.id === id);
    if (idx === -1) return SANS_ECRITURE;
    data[idx] = { id, ...validation.data };
    return data[idx];
  });
  if (item === SANS_ECRITURE) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const removed = await updateJSON(FILE, data => {
    const idx = data.findIndex((p: any) => p.id === id);
    if (idx === -1) return SANS_ECRITURE;
    return data.splice(idx, 1)[0];
  });
  if (removed === SANS_ECRITURE) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(removed);
}
