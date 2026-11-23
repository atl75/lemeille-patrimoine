import { NextResponse } from 'next/server';
import { readJSON, updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import type { NextRequest } from 'next/server';
import { insertArticleSchema } from '@/shared/schema';
import { toPublicArticle } from '@/lib/articlesData';

const FILE = 'articles.json';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await readJSON(FILE, { fresh: true });
  const item = data.find((a: any) => a.id === id);
  const result = isAdmin(req) ? item : toPublicArticle(item);
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404, headers });
  return NextResponse.json(result, { headers });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const validation = insertArticleSchema.omit({ id: true }).safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 });
  }
  let duplicate = false;
  const item = await updateJSON(FILE, data => {
    const idx = data.findIndex((a: any) => a.id === id);
    if (idx === -1) return SANS_ECRITURE;
    if (data.some((a: any) => a.slug === validation.data.slug && a.id !== id)) {
      duplicate = true;
      return SANS_ECRITURE;
    }
    data[idx] = { id, ...validation.data };
    return data[idx];
  });
  if (duplicate) return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 });
  if (item === SANS_ECRITURE) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const removed = await updateJSON(FILE, data => {
    const idx = data.findIndex((a: any) => a.id === id);
    if (idx === -1) return SANS_ECRITURE;
    return data.splice(idx, 1)[0];
  });
  if (removed === SANS_ECRITURE) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(removed);
}
