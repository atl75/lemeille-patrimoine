import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, updateJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

// Carnet de contacts entreprises : mémorise les informations saisies à la main
// (représentant légal, courriel, téléphone…) qui n'existent pas dans l'API
// publique, pour les réinjecter automatiquement la fois suivante.
const FILE = 'company-contacts.json';

const norm = (s: string) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
const keyOf = (c: any) => (c.siren ? `siren:${String(c.siren).replace(/\D/g, '')}` : `name:${norm(c.name)}`);

// GET ?siren=... ou ?name=... → contact mémorisé (ou null).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const siren = (sp.get('siren') || '').replace(/\D/g, '');
  const name = sp.get('name') || '';
  if (!siren && !name.trim()) return NextResponse.json({ contact: null });
  const data = await readJSON(FILE);
  const list = Array.isArray(data) ? data : [];
  const wanted = siren ? `siren:${siren}` : `name:${norm(name)}`;
  const contact = list.find((c: any) => keyOf(c) === wanted) || null;
  return NextResponse.json({ contact });
}

// POST → crée ou met à jour un contact (par SIREN, sinon par nom).
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }); }
  if (!b?.name && !b?.siren) return NextResponse.json({ error: 'Nom ou SIREN requis' }, { status: 400 });

  const fields = {
    siren: (b.siren || '').toString().trim(),
    name: (b.name || '').toString().trim(),
    legalForm: (b.legalForm || '').toString().trim(),
    address: (b.address || '').toString().trim(),
    managerFirstName: (b.managerFirstName || '').toString().trim(),
    managerLastName: (b.managerLastName || '').toString().trim(),
    managerRole: (b.managerRole || '').toString().trim(),
    email: (b.email || '').toString().trim(),
    phone: (b.phone || '').toString().trim(),
  };
  const k = keyOf(fields);

  await updateJSON(FILE, (data: any[]) => {
    const list = Array.isArray(data) ? data : [];
    const i = list.findIndex((c: any) => keyOf(c) === k);
    // Ne conserve que les champs non vides pour ne pas écraser un ancien contact complet.
    const nonEmpty = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== ''));
    if (i >= 0) list[i] = { ...list[i], ...nonEmpty };
    else list.push({ ...fields });
    return list;
  });
  return NextResponse.json({ success: true });
}
