import { NextResponse } from 'next/server';
import { readJSON, updateJSON, uid } from '@/lib/utils';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { insertProgramSchema } from '@/shared/schema';
import { programCollection, publicPrograms } from '@/lib/programsData';

const FILE = 'programs.json';

export async function GET(req: NextRequest) {
  const data = await readJSON(FILE, { fresh: true });
  const result = isAdmin(req) ? programCollection(data) : publicPrograms(data);
  return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const validation = insertProgramSchema.omit({ id: true }).safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 });
  }
  const item = { id: uid('p'), ...validation.data };
  await updateJSON(FILE, data => { data.push(item); });
  return NextResponse.json(item);
}
