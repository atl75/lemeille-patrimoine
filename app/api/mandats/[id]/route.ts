import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { erreurMandatImmeuble } from '@/lib/validationMandatImmeuble';

const FILE = 'mandats.json';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await readJSON(FILE);
  const m = (Array.isArray(data) ? data : []).find((x: any) => x.id === id);
  if (!m) return NextResponse.json({ error: 'Mandat non trouvé' }, { status: 404 });
  return NextResponse.json(m);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  let updates: any;
  try { updates = await req.json(); } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }); }
  let signed = false;
  let erreur: string | null = null;
  const item = await updateJSON(FILE, data => {
    signed=false;erreur=null;
    const i = data.findIndex((x: any) => x.id === id);
    if (i < 0) return SANS_ECRITURE;
    // La signature est contrôlée DANS la mutation, pas sur une lecture périmée.
    if (data[i].mandateSignStatus === 'SIGNED' || data[i].mandateSignature?.dataUrl || data[i].signers?.some((s:any)=>s.dataUrl)) { signed = true; return SANS_ECRITURE; }
    const next = { ...data[i], ...updates, id: data[i].id, createdAt: data[i].createdAt };
    erreur=erreurMandatImmeuble(next);if(erreur)return SANS_ECRITURE;
    // Les preuves et liens de signature ne sont pas des champs d'édition.
    for(const k of ['signers','mandateSignStatus','mandateSignature','mandateSignToken','mandate','avenants']) {
      if(k in data[i])next[k]=data[i][k];else delete next[k];
    }
    data[i] = next;
    return data[i];
  });
  if (signed) return NextResponse.json({ error: 'Ce mandat est signé : il ne peut plus être modifié.' }, { status: 409 });
  if(erreur)return NextResponse.json({error:erreur},{status:400});
  if (item === SANS_ECRITURE) return NextResponse.json({ error: 'Mandat non trouvé' }, { status: 404 });
  return NextResponse.json({ success: true, mandat: item });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  let signed = false;
  const removed = await updateJSON(FILE, data => {
    const i = data.findIndex((x: any) => x.id === id);
    if (i < 0) return SANS_ECRITURE;
    if (data[i].mandateSignStatus === 'SIGNED' || data[i].mandateSignature?.dataUrl || data[i].signers?.some((s:any)=>s.dataUrl)) { signed = true; return SANS_ECRITURE; }
    return data.splice(i, 1)[0];
  });
  if (signed) return NextResponse.json({ error: 'Un mandat signé ne peut pas être supprimé.' }, { status: 409 });
  if (removed === SANS_ECRITURE) return NextResponse.json({ error: 'Mandat non trouvé' }, { status: 404 });
  return NextResponse.json({ success: true });
}
