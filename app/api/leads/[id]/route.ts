import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const updates = await req.json();
    const leads = await readJSON('leads.json');

    const leadIndex = leads.findIndex((l: any) => l.id === id);
    if (leadIndex === -1) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    // Mettre à jour le lead en conservant les données existantes
    leads[leadIndex] = {
      ...leads[leadIndex],
      ...updates,
      id, // S'assurer que l'ID ne change pas
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
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const leads = await readJSON('leads.json');

    const leadIndex = leads.findIndex((l: any) => l.id === id);
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
