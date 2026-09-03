import { NextResponse } from 'next/server';
import { updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, actionId } = await params;

    // Le message d'erreur est décidé DANS le verrou, sur la donnée fraîche.
    let erreur: string | null = 'Lead non trouvé';
    await updateJSON('leads.json', (leads: any[]) => {
      const leadIndex = leads.findIndex((l: any) => l.id === id);
      if (leadIndex === -1) return SANS_ECRITURE;

      if (!leads[leadIndex].actions) {
        erreur = 'Aucune action trouvée';
        return SANS_ECRITURE;
      }

      const actionIndex = leads[leadIndex].actions.findIndex((a: any) => a.id === actionId);
      if (actionIndex === -1) {
        erreur = 'Action non trouvée';
        return SANS_ECRITURE;
      }

      erreur = null;
      leads[leadIndex].actions[actionIndex].completed = !leads[leadIndex].actions[actionIndex].completed;
      return leads;
    });

    if (erreur) return NextResponse.json({ error: erreur }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
