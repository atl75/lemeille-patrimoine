import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await req.json();
    const leads = await readJSON('leads.json');
    
    const leadIndex = leads.findIndex((l: any) => l.id === params.id);
    if (leadIndex === -1) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    // Mettre à jour le lead en conservant les données existantes
    leads[leadIndex] = {
      ...leads[leadIndex],
      ...updates,
      id: params.id, // S'assurer que l'ID ne change pas
      createdAt: leads[leadIndex].createdAt, // Conserver la date de création
    };

    await writeJSON('leads.json', leads);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leads = await readJSON('leads.json');
    
    const leadIndex = leads.findIndex((l: any) => l.id === params.id);
    if (leadIndex === -1) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    leads.splice(leadIndex, 1);
    await writeJSON('leads.json', leads);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
