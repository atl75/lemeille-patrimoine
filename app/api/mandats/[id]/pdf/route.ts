import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { buildMandatePdf } from '@/lib/mandatPdf';
import { erreurPdfMandatImmeuble } from '@/lib/validationMandatImmeuble';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const data = await readJSON('mandats.json', { fresh: true });
    if (!Array.isArray(data)) return NextResponse.json({ error: 'Registre des mandats indisponible' }, { status: 503 });
    const m = data.find((x: any) => x.id === id);
    if (!m) return NextResponse.json({ error: 'Mandat non trouvé' }, { status: 404 });
    const erreur=erreurPdfMandatImmeuble(m);if(erreur)return NextResponse.json({error:erreur},{status:409});
    const bytes = await buildMandatePdf(m);
    const disposition = req.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline';
    const reference = String(m.mandateNumber || id).replace(/[^a-zA-Z0-9_-]/g, '-');
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, no-store',
        'Vary': 'Cookie',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `${disposition}; filename="mandat-${reference}.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Impossible de préparer le PDF du mandat. Réessayez.' }, { status: 500 });
  }
}
