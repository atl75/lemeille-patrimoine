import { NextResponse } from 'next/server';
import { updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const updates = await req.json();

    // Lecture et écriture sous le même verrou : sinon une modification
    // simultanée sur un autre lead était effacée par celle-ci.
    let trouve = false;
    await updateJSON('leads.json', (leads: any[]) => {
      const leadIndex = leads.findIndex((l: any) => l.id === id);
      if (leadIndex === -1) return SANS_ECRITURE;
      trouve = true;

      // Mettre à jour le lead en conservant les données existantes
      leads[leadIndex] = {
        ...leads[leadIndex],
        ...updates,
        id, // S'assurer que l'ID ne change pas
        createdAt: leads[leadIndex].createdAt, // Conserver la date de création
        lastActivityAt: new Date().toISOString(), // Horodatage de dernière action (relances)
      };
      return leads;
    });

    if (!trouve) return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;

    let trouve = false;
    await updateJSON('leads.json', (leads: any[]) => {
      const leadIndex = leads.findIndex((l: any) => l.id === id);
      if (leadIndex === -1) return SANS_ECRITURE;
      trouve = true;
      leads.splice(leadIndex, 1);
      return leads;
    });

    if (!trouve) return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
