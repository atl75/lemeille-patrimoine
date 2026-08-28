import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, updateJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

// Carnet de contacts notaires : mémorise les infos saisies à la main (nom du
// notaire, téléphone, email, clerc…) par office notarial, pour les réinjecter
// automatiquement quand le même office est sélectionné la fois suivante.
const FILE = 'notary-contacts.json';
const norm = (s: string) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const office = req.nextUrl.searchParams.get('office') || '';
  const data = await readJSON(FILE);
  const list = Array.isArray(data) ? data : [];
  // Sans paramètre `office` : renvoie tout le carnet (pour le répertoire).
  if (!office.trim()) return NextResponse.json({ contacts: list });
  const contact = list.find((c: any) => norm(c.officeName) === norm(office)) || null;
  return NextResponse.json({ contact });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }); }
  if (!b?.officeName) return NextResponse.json({ error: 'Office requis' }, { status: 400 });

  const fields = {
    officeName: (b.officeName || '').toString().trim(),
    notaryName: (b.notaryName || '').toString().trim(),
    address: (b.address || '').toString().trim(),
    city: (b.city || '').toString().trim(),
    postalCode: (b.postalCode || '').toString().trim(),
    phone: (b.phone || '').toString().trim(),
    email: (b.email || '').toString().trim(),
    clerkName: (b.clerkName || '').toString().trim(),
    clerkEmail: (b.clerkEmail || '').toString().trim(),
  };

  await updateJSON(FILE, (data: any[]) => {
    const list = Array.isArray(data) ? data : [];
    const i = list.findIndex((c: any) => norm(c.officeName) === norm(fields.officeName));
    // Ne conserve que les champs non vides pour ne pas écraser un contact plus complet.
    const nonEmpty = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== ''));
    if (i >= 0) list[i] = { ...list[i], ...nonEmpty };
    else list.push({ ...fields });
    return list;
  });
  return NextResponse.json({ success: true });
}
