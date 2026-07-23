import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import type { NextRequest } from 'next/server';
import { insertProgramSchema } from '@/shared/schema';

const FILE = 'programs.json';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await readJSON(FILE);
  const item = data.find((p: any) => p.id === id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const validation = insertProgramSchema.omit({ id: true }).safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 });
  }
  const data = await readJSON(FILE);
  const idx = data.findIndex((p: any) => p.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  data[idx] = { id, ...validation.data };
  await writeJSON(FILE, data);
  return NextResponse.json(data[idx]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await readJSON(FILE);
  const idx = data.findIndex((p: any) => p.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [removed] = data.splice(idx, 1);
  await writeJSON(FILE, data);
  return NextResponse.json(removed);
}
