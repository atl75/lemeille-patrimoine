import { NextResponse } from 'next/server';
import { readJSON, writeJSON, uid } from '@/lib/utils';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { toPublicProperty } from '@/lib/publicProperty';
import { insertPropertySchema } from '@/shared/schema';

const FILE = 'properties.json';
export async function GET(req: NextRequest) {
  const data = await readJSON(FILE);
  if (isAdmin(req)) {
    return NextResponse.json(data);
  }
  return NextResponse.json(
    data.filter((p: any) => p.visible !== false).map(toPublicProperty)
  );
}
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const validation = insertPropertySchema.omit({ id: true }).safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 });
  }
  const data = await readJSON(FILE);
  const item = { id: uid('b'), ...validation.data };
  data.push(item);
  await writeJSON(FILE, data);
  return NextResponse.json(item);
}
