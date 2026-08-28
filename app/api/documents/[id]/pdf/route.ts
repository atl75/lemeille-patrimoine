import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

// Sert le PDF archivé d'un bon de visite / offre d'achat (admin).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await readJSON('documents.json');
  const doc = (Array.isArray(data) ? data : []).find((d: any) => d.id === id);
  if (!doc?.pdf) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 });
  const b64 = String(doc.pdf).split(',')[1] || '';
  const bytes = Buffer.from(b64, 'base64');
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${doc.number || 'document'}.pdf"`,
      'Content-Length': bytes.length.toString(),
    },
  });
}
