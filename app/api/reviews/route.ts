import { NextResponse } from 'next/server';
import { readJSON, writeJSON, uid } from '@/lib/utils';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { insertReviewSchema } from '@/shared/schema';

const FILE = 'reviews.json';

export async function GET(req: NextRequest) {
  const data = await readJSON(FILE);
  if (isAdmin(req)) {
    return NextResponse.json(data);
  }
  return NextResponse.json(data.filter((r: any) => r.published === true));
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const validation = insertReviewSchema.omit({ id: true }).safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 });
  }
  const data = await readJSON(FILE);
  const item = { id: uid('r'), ...validation.data };
  data.push(item);
  await writeJSON(FILE, data);
  return NextResponse.json(item);
}
