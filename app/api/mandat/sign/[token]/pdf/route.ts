import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON } from '@/lib/utils';
import { buildMandatePdf } from '@/lib/mandatPdf';

// Route PUBLIQUE : sert le PDF du mandat correspondant au jeton de signature,
// affiché en ligne (inline) pour que le mandant puisse le lire avant de signer.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const data = await readJSON('properties.json');
    const p = data.find((x: any) => x.mandateSignToken && x.mandateSignToken === token);
    if (!p) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 });

    const bytes = await buildMandatePdf(p);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="mandat-${p.mandateNumber || 'vente'}.pdf"`,
        'Content-Length': bytes.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Mandat sign PDF error:', error);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
