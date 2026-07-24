import { NextResponse } from 'next/server';
import { readJSON, writeJSON, uid } from '@/lib/utils';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { insertArticleSchema } from '@/shared/schema';

const FILE = 'articles.json';

export async function GET(req: NextRequest) {
  const data = await readJSON(FILE);
  if (isAdmin(req)) {
    return NextResponse.json(data);
  }
  return NextResponse.json(data.filter((a: any) => a.published !== false));
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const validation = insertArticleSchema.omit({ id: true }).safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 });
  }
  const data = await readJSON(FILE);
  if (data.some((a: any) => a.slug === validation.data.slug)) {
    return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 });
  }
  const item = { id: uid('art'), ...validation.data };
  data.push(item);
  await writeJSON(FILE, data);
  return NextResponse.json(item);
}
