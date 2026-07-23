import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const { id, actionId } = await params;
    const leads = await readJSON('leads.json');

    const leadIndex = leads.findIndex((l: any) => l.id === id);
    if (leadIndex === -1) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    if (!leads[leadIndex].actions) {
      return NextResponse.json({ error: 'Aucune action trouvée' }, { status: 404 });
    }

    const actionIndex = leads[leadIndex].actions.findIndex((a: any) => a.id === actionId);
    if (actionIndex === -1) {
      return NextResponse.json({ error: 'Action non trouvée' }, { status: 404 });
    }

    leads[leadIndex].actions[actionIndex].completed = !leads[leadIndex].actions[actionIndex].completed;
    await writeJSON('leads.json', leads);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
