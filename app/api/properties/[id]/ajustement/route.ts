import { NextResponse } from 'next/server';
import { updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

/**
 * Enregistre l'argumentaire de baisse de prix d'un bien : comparables retenus,
 * prix visé, date de mise en vente. Rien n'est calculé ici — les chiffres se
 * déduisent à l'affichage, ce qui évite de figer une analyse périmée dans le
 * fichier de données.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const ajustement = {
      comparables: Array.isArray(body?.comparables) ? body.comparables.slice(0, 40) : [],
      prixCible: Number(body?.prixCible) || undefined,
      dateMiseEnVente: body?.dateMiseEnVente ? String(body.dateMiseEnVente).slice(0, 10) : undefined,
      commentaire: body?.commentaire ? String(body.commentaire).slice(0, 4000) : undefined,
      // Le prix de référence vient d'une page tierce que l'agent a relevée à la
      // main : sans lui, le document perdait cette source à chaque rechargement.
      reference: Number(body?.reference?.m2) > 0 ? {
        m2: Number(body.reference.m2),
        bas: Number(body.reference.bas) > 0 ? Number(body.reference.bas) : undefined,
        haut: Number(body.reference.haut) > 0 ? Number(body.reference.haut) : undefined,
        source: body.reference.source ? String(body.reference.source).slice(0, 80) : undefined,
      } : undefined,
      dvfRayon: Number(body?.dvfRayon) > 0 ? Number(body.dvfRayon) : undefined,
      dvfDepuis: Number(body?.dvfDepuis) > 0 ? Number(body.dvfDepuis) : undefined,
      dvfPieces: Number(body?.dvfPieces) > 0 ? Number(body.dvfPieces) : undefined,
      dvfSurfaceMin: Number(body?.dvfSurfaceMin) > 0 ? Number(body.dvfSurfaceMin) : undefined,
      dvfSurfaceMax: Number(body?.dvfSurfaceMax) > 0 ? Number(body.dvfSurfaceMax) : undefined,
      majAt: new Date().toISOString(),
    };

    let trouve = false;
    await updateJSON('properties.json', (biens: any[]) => {
      const i = biens.findIndex((b: any) => String(b.id) === String(id));
      if (i === -1) return SANS_ECRITURE;
      trouve = true;
      biens[i].ajustementPrix = ajustement;
      return biens;
    });

    if (!trouve) return NextResponse.json({ error: 'Bien non trouvé' }, { status: 404 });
    return NextResponse.json({ success: true, ajustement });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
