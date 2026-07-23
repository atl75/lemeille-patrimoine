import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; actionId: string } }
) {
  try {
    const leads = await readJSON('leads.json');
    
    const leadIndex = leads.findIndex((l: any) => l.id === params.id);
    if (leadIndex === -1) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    if (!leads[leadIndex].actions) {
      return NextResponse.json({ error: 'Aucune action trouvée' }, { status: 404 });
    }

    const actionIndex = leads[leadIndex].actions.findIndex((a: any) => a.id === params.actionId);
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
