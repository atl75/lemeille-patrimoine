import { NextResponse } from 'next/server';
import { readJSON, updateJSON, SANS_ECRITURE, uid } from '@/lib/utils';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { insertArticleSchema } from '@/shared/schema';
import { publicArticles } from '@/lib/articlesData';

const FILE = 'articles.json';

export async function GET(req: NextRequest) {
  const data = await readJSON(FILE, { fresh: true });
  return NextResponse.json(isAdmin(req) ? data : publicArticles(data), {
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const validation = insertArticleSchema.omit({ id: true }).safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 });
  }
  const item = { id: uid('art'), ...validation.data };
  const result = await updateJSON(FILE, data => {
    if (data.some((a: any) => a.slug === item.slug)) return SANS_ECRITURE;
    data.push(item);
    return item;
  });
  if (result === SANS_ECRITURE) return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 });
  return NextResponse.json(result);
}
