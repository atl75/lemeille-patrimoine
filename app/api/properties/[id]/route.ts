import { NextResponse } from 'next/server';
import { readJSON, updateJSON, SANS_ECRITURE } from '@/lib/utils';
import { revalidatePublicProperties } from '@/lib/revalidateProperties';
import { rememberNotaries } from '@/lib/rememberNotaries';
import { isAdmin } from '@/lib/adminGuard';
import { toPublicProperty } from '@/lib/publicProperty';
import type { NextRequest } from 'next/server';
import { insertPropertySchema } from '@/shared/schema';
import { fusionneBien } from '@/lib/fusionBien';

const FILE = 'properties.json';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await readJSON(FILE);
  const item = data.find((p: any) => p.id === id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Admin authentifié : objet complet. Public : projection sûre (sans
  // données sensibles ; adresse réduite à la ville en mode zone) et biens
  // non visibles masqués.
  if (isAdmin(req)) return NextResponse.json(item);
  if (item.visible === false) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(toPublicProperty(item));
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const validation = insertPropertySchema.omit({ id: true }).safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 });
  }
  // Écriture en compare-et-échange : lire puis écrire séparément perdait la
  // modification concurrente — et c'est une autre voie vers la même perte de
  // données que celle corrigée ici.
  let enregistre: any = null;
  await updateJSON(FILE, (data: any[]) => {
    const idx = data.findIndex((p: any) => p.id === id);
    if (idx === -1) return SANS_ECRITURE;
    // Le formulaire du bien ne gère QUE les champs du schéma. L'argumentaire de
    // prix lui est étranger : l'écraser revenait à le supprimer.
    data[idx] = fusionneBien(data[idx], validation.data, Object.keys(insertPropertySchema.shape), id);
    enregistre = data[idx];
    return data;
  });
  if (!enregistre) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  revalidatePublicProperties();
  await rememberNotaries(enregistre);
  return NextResponse.json(enregistre);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  // Même écriture atomique que la modification : une suppression qui lit puis
  // écrit séparément perd ce qu'un autre onglet vient d'enregistrer.
  let supprime: any = null;
  await updateJSON(FILE, (data: any[]) => {
    const idx = data.findIndex((p: any) => p.id === id);
    if (idx === -1) return SANS_ECRITURE;
    supprime = data.splice(idx, 1)[0];
    return data;
  });
  if (!supprime) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  revalidatePublicProperties();
  return NextResponse.json(supprime);
}
