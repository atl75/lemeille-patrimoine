import { NextResponse } from 'next/server';
import { updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

/**
 * Supprime une note. Un commentaire ne se modifie pas — corriger une faute de
 * frappe, c'est retirer la ligne et la ressaisir. `lastActivityAt` n'est pas
 * touché : effacer une note n'est pas un contact avec le client, et le remonter
 * repousserait la relance sans raison.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; commentaireId: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, commentaireId } = await params;

    let trouve = false;
    await updateJSON('leads.json', (leads: any[]) => {
      const i = leads.findIndex((l: any) => l.id === id);
      if (i === -1) return SANS_ECRITURE;
      const avant = leads[i].commentaires?.length ?? 0;
      leads[i].commentaires = (leads[i].commentaires || []).filter(
        (c: any) => c.id !== commentaireId,
      );
      if (leads[i].commentaires.length === avant) return SANS_ECRITURE;
      trouve = true;
      return leads;
    });

    if (!trouve) return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
