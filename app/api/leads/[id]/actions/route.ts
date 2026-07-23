import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const action = await req.json();
    const leads = await readJSON('leads.json');

    const leadIndex = leads.findIndex((l: any) => l.id === id);
    if (leadIndex === -1) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    if (!leads[leadIndex].actions) {
      leads[leadIndex].actions = [];
    }

    leads[leadIndex].actions.push(action);
    await writeJSON('leads.json', leads);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
