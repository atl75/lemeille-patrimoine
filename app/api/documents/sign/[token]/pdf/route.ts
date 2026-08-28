import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON } from '@/lib/utils';

// Sert le document au propriétaire pour lecture avant acceptation. Le jeton
// tient lieu d'autorisation ; on ne renvoie que ce document-là.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await readJSON('documents.json');
  const doc = (Array.isArray(data) ? data : []).find((d: any) => d.ownerSignToken && d.ownerSignToken === token);
  if (!doc?.pdf) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const bytes = Buffer.from(String(doc.pdf).split(',')[1] || '', 'base64');
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${doc.number || 'offre'}.pdf"`,
      'Content-Length': bytes.length.toString(),
    },
  });
}
