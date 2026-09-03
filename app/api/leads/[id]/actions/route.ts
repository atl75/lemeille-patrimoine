import { NextResponse } from 'next/server';
import { updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const action = await req.json();

    let trouve = false;
    await updateJSON('leads.json', (leads: any[]) => {
      const leadIndex = leads.findIndex((l: any) => l.id === id);
      if (leadIndex === -1) return SANS_ECRITURE;
      trouve = true;

      if (!leads[leadIndex].actions) {
        leads[leadIndex].actions = [];
      }
      leads[leadIndex].actions.push(action);
      return leads;
    });

    if (!trouve) return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
