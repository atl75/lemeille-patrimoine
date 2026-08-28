import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { buildDocumentPdf, type DocData } from '@/lib/documentPdf';

// Aperçu du document (bon de visite / offre d'achat) AVANT signature — non
// enregistré, avec une ligne de signature vierge. Réservé à l'admin.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }); }

  const type = b.type === 'OFFRE' ? 'OFFRE' : 'VISITE';
  const props = await readJSON('properties.json');
  const p = (Array.isArray(props) ? props : []).find((x: any) => x.id === b.propertyId);
  if (!p) return NextResponse.json({ error: 'Bien introuvable.' }, { status: 404 });

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const docData: DocData = {
    type, number: 'APERÇU',
    property: {
      title: p.title, type: p.type, rooms: p.rooms, city: p.city, region: p.region,
      address: p.map?.query || '', price: p.price, surface: p.surface, cadastralReference: p.cadastralReference,
    },
    client: b.client || {},
    offerAmount: b.offerAmount != null ? Number(b.offerAmount) : undefined,
    atAskingPrice: !!b.atAskingPrice,
    sequestreAmount: b.sequestreAmount != null ? Number(b.sequestreAmount) : undefined,
    validityDays: b.validityDays != null ? Number(b.validityDays) : undefined,
    financing: b.financing === 'CREDIT' ? 'CREDIT' : 'COMPTANT',
    place: b.place || p.city || '',
    dateStr,
    // Pas de signature → ligne vierge (document non signé).
  };

  try {
    const bytes = await buildDocumentPdf(docData);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="apercu.pdf"', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('Aperçu document échoué:', e);
    return NextResponse.json({ error: 'Échec de la génération de l\'aperçu.' }, { status: 500 });
  }
}
