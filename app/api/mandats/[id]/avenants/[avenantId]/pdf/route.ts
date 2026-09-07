import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { buildAvenantPdf } from '@/lib/avenantPdf';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; avenantId: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, avenantId } = await params;
    const data = await readJSON('mandats.json');
    const m = (Array.isArray(data) ? data : []).find((x: any) => x.id === id);
    if (!m) return NextResponse.json({ error: 'Mandat non trouvé' }, { status: 404 });
    const av = (Array.isArray(m.avenants) ? m.avenants : []).find((a: any) => a.id === avenantId);
    if (!av) return NextResponse.json({ error: 'Avenant non trouvé' }, { status: 404 });

    const bytes = await buildAvenantPdf(m, av);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="avenant-${av.numero || 1}-mandat-${m.mandateNumber || id}.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Erreur PDF', details: e?.message }, { status: 500 });
  }
}
